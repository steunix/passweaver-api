/**
 * Folders controller module
 * @module controllers/folders
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { newId } from '../../../lib/id.mjs'
import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Folder from '../../../model/folder.mjs'
import * as Group from '../../../model/group.mjs'
import * as Cache from '../../../lib/cache.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Const from '../../../lib/const.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'

import DB from '../../../lib/db.mjs'
import { isReadOnly } from '../../../lib/auth.mjs'

/**
 * Get a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function get (req, res, next) {
  const folderid = req.params.id

  // Search folder
  const folder = await DB.folders.findUnique({
    where: { id: folderid }
  })
  if (!folder) {
    res.status(R.NOT_FOUND).send(R.ko('Folder not found'))
    return
  }

  // Check permissions
  const perm = await Folder.permissions(folderid, req.user)
  if (!perm.read) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Add permissions to the payload
  folder.permissions = perm

  res.send(R.ok(folder))
}

/**
 * Create a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function create (req, res, next) {
  // Check if system is readonly
  if (await isReadOnly(req)) {
    res.status(R.CONFLICT).send(R.conflict())
    return
  }

  // Validate payload
  if (!JV.validate(req.body, 'folder_create')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // Search parent folder
  if (!Folder.exists(req.params.parent)) {
    res.status(R.NOT_FOUND).send(R.ko('Parent folder not found'))
    return
  }

  // Check write permissions on parent folder
  const perm = await Folder.permissions(req.params.parent, req.user)
  if (!perm.write) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // If leaf of a personal folder, it must be personal too
  const ispersonal = await Folder.isPersonal(req.params.parent)

  // Admin cannot create personal folders
  if (await Auth.isAdmin(req) && ispersonal) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Creates the folder
  const newid = newId()
  await DB.folders.createMany({
    data: [{
      id: newid,
      description: req.body.description,
      personal: ispersonal,
      parent: req.params.parent,
      userid: ispersonal ? req.user : null
    }]
  })

  await Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_FOLDER, newid)
  await Cache.resetFoldersTree()
  res.status(R.CREATED).send(R.ok({ id: newid }))
}

/**
 * Update a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function update (req, res, next) {
  // Check if system is readonly
  if (await isReadOnly(req)) {
    res.status(R.CONFLICT).send(R.conflict())
    return
  }

  // Validate payload
  if (!JV.validate(req.body, 'folder_update')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  const folderid = req.params.id

  // Check for root folder
  if (folderid === Const.PW_FOLDER_ROOTID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Root folder cannot be updated'))
    return
  }

  // Check for Personal root folder
  if (folderid === Const.PW_FOLDER_PERSONALROOTID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Personal root folder cannot be updated'))
    return
  }

  // Search folder
  const folder = await DB.folders.findUnique({
    where: { id: folderid }
  })

  if (!folder) {
    res.status(R.NOT_FOUND).send(R.ko('Folder not found'))
    return
  }

  // Admin cannot update personal folders
  if (await Auth.isAdmin(req) && folder.personal) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Personal folders roots cannot be altered, subfolders can
  if (folder.personal && folder.parent === Const.PW_FOLDER_PERSONALROOTID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Personal folders cannot be updated'))
    return
  }

  // Check write permissions on current folder
  const perm1 = await Folder.permissions(folder.id, req.user)
  if (!perm1.write) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // If parent is given, check for correctness
  if (req.body.parent) {
    if (folder.personal) {
      res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Personal folders cannot be moved'))
      return
    }

    // Parent cannot be itself
    if (req.body.parent === folder.id) {
      res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Target folder is invalid'))
      return
    }

    // Search parent folder
    const pfolder = await DB.folders.findUnique({
      where: { id: req.body.parent }
    })
    if (!pfolder) {
      res.status(R.NOT_FOUND).send(R.ko('Target folder not found'))
      return
    }

    // Parent cannot be a personal folder
    if (pfolder.personal) {
      res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Target folder cannot be personal'))
      return
    }

    // Parent cannot be one of its current children, otherwise it would break the tree
    const children = await Folder.children(folder.id)
    if (children.find((elem) => { return elem.id === req.body.parent })) {
      res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Target folder is invalid'))
      return
    }

    // Check write permissions on new parent folder
    const perm2 = await Folder.permissions(req.body.parent, req.user)
    if (!perm2.write) {
      res.status(R.FORBIDDEN).send(R.forbidden())
      return
    }
  }

  const updateStruct = {}
  if (req.body.description) {
    updateStruct.description = req.body.description
  }
  if (req.body.parent) {
    updateStruct.parent = req.body.parent
  }

  // Update folder
  await DB.folders.updateMany({
    data: updateStruct,
    where: {
      id: folderid
    }
  })

  await Folder.updateFTS(folderid)

  // If reparenting, recalc fts for old folder too
  if (req.body.parent) {
    await Folder.updateFTS(folder.id)
  }

  await Events.add(req.user, Const.EV_ACTION_UPDATE, Const.EV_ENTITY_FOLDER, folderid)
  await Cache.resetFoldersTree()
  res.send(R.ok())
}

/**
 * Delete a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function remove (req, res, next) {
  // Check if system is readonly
  if (await isReadOnly(req)) {
    res.status(R.CONFLICT).send(R.conflict())
    return
  }

  const folderid = req.params.id

  // Root folder cannot be deleted
  if (folderid === Const.PW_FOLDER_ROOTID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Root folder cannot be deleted'))
    return
  }

  // Personal folder root cannot be deleted
  if (folderid === Const.PW_FOLDER_PERSONALROOTID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Personal folders root cannot be deleted'))
    return
  }

  // Search folder
  const folder = await DB.folders.findUnique({
    where: { id: folderid }
  })
  if (!folder) {
    res.status(R.NOT_FOUND).send(R.ko('Folder not found'))
    return
  }

  // Personal folders roots cannot be removed, subfolders can
  if (folder.personal && folder.parent === Const.PW_FOLDER_PERSONALROOTID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Personal folders cannot be deleted'))
    return
  }

  // Admin cannot remove personal folders
  if (await Auth.isAdmin(req) && folder.personal) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Check write permissions on folder
  const perm = await Folder.permissions(folderid, req.user)
  if (!perm.write) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Search folder items
  const items = await DB.items.findFirst({
    where: { folderid }
  })
  if (items !== null) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Folder not empty, items found'))
    return
  }

  // Search children folders
  const children = await DB.folders.findFirst({
    where: { parent: folderid }
  })
  if (children !== null) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Folder not empty, subfolders found'))
    return
  }

  await DB.$transaction(async (tx) => {
    // Deletes folder permissions
    await DB.folderspermissions.deleteMany({
      where: { folderid }
    })

    // Deletes folder
    await DB.folders.delete({
      where: { id: folderid }
    })
  })

  await Events.add(req.user, Const.EV_ACTION_DELETE, Const.EV_ENTITY_FOLDER, folderid)
  await Cache.resetFoldersTree()
  res.send(R.ok())
}

/**
 * Add a group to a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function addGroup (req, res, next) {
  // Check if system is readonly
  if (await isReadOnly(req)) {
    res.status(R.CONFLICT).send(R.conflict())
    return
  }

  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Checks for valid payload
  if (!JV.validate(req.body, 'folder_group')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // Check for permissions
  if (req.body.write && !req.body.read) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('If write is true, also read must be true'))
    return
  }

  // Checks the group
  if (!await Group.exists(req.params.group)) {
    res.status(R.NOT_FOUND).send(R.ko('Group not found'))
    return
  }

  // Checks the folder
  if (!await Folder.exists(req.params.folder)) {
    res.status(R.NOT_FOUND).send(R.ko('Folder not found'))
    return
  }

  // Checks is group is alread assigned
  const perm = await DB.folderspermissions.findFirst({
    where: {
      folderid: req.params.folder,
      groupid: req.params.group
    },
    select: { id: true }
  })
  if (perm) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Group is already associated to folder'))
    return
  }

  // Adds the permission
  await DB.folderspermissions.createMany({
    data: [{
      groupid: req.params.group,
      folderid: req.params.folder,
      read: req.body.read,
      write: req.body.write
    }]
  })

  await Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_FOLDER, req.params.folder, req.params.group)
  await Cache.resetFoldersTree()
  res.send(R.ok())
}

/**
 * Set group permissions
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function setGroup (req, res, next) {
  // Check if system is readonly
  if (await isReadOnly(req)) {
    res.status(R.CONFLICT).send(R.conflict())
    return
  }

  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Checks for valid payload
  if (!JV.validate(req.body, 'folder_group')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // Check for permissions
  if (req.body.write && !req.body.read) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('If write is true, also read must be true'))
    return
  }

  // Checks the group
  if (!await Group.exists(req.params.group)) {
    res.status(R.NOT_FOUND).send(R.ko('Group not found'))
    return
  }

  // Check the folder
  if (!await Folder.exists(req.params.folder)) {
    res.status(R.NOT_FOUND).send(R.ko('Folder not found'))
    return
  }

  // Check if group is already assigned
  const perm = await DB.folderspermissions.findFirst({
    where: {
      folderid: req.params.folder,
      groupid: req.params.group
    },
    select: { id: true }
  })
  if (!perm) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Group is not associated to this folder'))
    return
  }

  // Update permissions
  await DB.folderspermissions.update({
    where: { id: perm.id },
    data: {
      read: req.body.read,
      write: req.body.write
    }
  })

  await Events.add(req.user, Const.EV_ACTION_UPDATE, Const.EV_ENTITY_FOLDER, req.params.folder)
  await Cache.resetFoldersTree()
  res.send(R.ok())
}

/**
 * Delete a group from a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function removeGroup (req, res, next) {
  // Check if system is readonly
  if (await isReadOnly(req)) {
    res.status(R.CONFLICT).send(R.conflict())
    return
  }

  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Checks the group
  if (!await Group.exists(req.params.group)) {
    res.status(R.NOT_FOUND).send(R.ko('Group not found'))
    return
  }

  // Checks the folder
  if (!await Folder.exists(req.params.folder)) {
    res.status(R.NOT_FOUND).send(R.ko('Folder not found'))
    return
  }

  // Checks is group is assigned
  const perm = await DB.folderspermissions.findFirst({
    where: {
      folderid: req.params.folder,
      groupid: req.params.group
    },
    select: { id: true }
  })
  if (perm === null) {
    res.status(R.NOT_FOUND).send(R.ko('Group is not associated to folder'))
    return
  }

  // Admins group cannot be removed from Root group
  if (req.params.group === Const.PW_GROUP_ADMINSID && req.params.folder === Const.PW_FOLDER_ROOTID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Admin cannot be removed from root folder'))
    return
  }

  await DB.folderspermissions.delete({
    where: {
      id: perm.id
    }
  })

  await Events.add(req.user, Const.EV_ACTION_DELETE, Const.EV_ENTITY_FOLDER, req.params.folder, req.params.group)
  await Cache.resetFoldersTree()
  res.send(R.ok())
}

/**
 * Get group associated to a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Object} next Next
 * @returns
 */
export async function groups (req, res, next) {
  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Checks the folder
  if (!await Folder.exists(req.params.id)) {
    res.status(R.NOT_FOUND).send(R.ko('Folder not found'))
    return
  }

  // Get folders parents
  const parents = await Folder.parents(req.params.id)
  const perms = new Map()
  const canmodify = !parents[0].personal && parents[0].id !== Const.PW_FOLDER_PERSONALROOTID

  // For each folder, group permissions are OR'ed
  for (const folder of parents) {
    const groups = await DB.folderspermissions.findMany({
      where: {
        folderid: folder.id
      },
      include: {
        groups: {},
        folders: {}
      }
    })

    for (const group of groups) {
      const perm = perms.get(group.id) ?? { id: '', description: '', canmodify: false, inherited: false, read: false, write: false }
      perm.id = group.groups.id
      perm.canmodify = canmodify
      perm.description = group.groups.description
      perm.inherited = (group.folderid !== req.params.id)
      perm.read |= group.read
      perm.write |= group.write
      perms.set(group.id, perm)
    }
  }

  // Create array from map
  let groups = Array.from(perms.values())

  // Filter unique inherited values
  groups = groups.filter((obj, index) => {
    const idx = groups.findIndex((item) => { return item.inherited === obj.inherited && item.description === obj.description && item.read === obj.read && item.write === obj.write })
    return idx === index
  })

  groups.sort((a, b) => {
    if (a.description < b.description) { return -1 }
    if (a.description > b.description) { return 1 }
    return 0
  })

  res.send(R.ok(groups))
}

/**
 * Get the tree of visible folders for current user
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function tree (req, res, next) {
  const tree = await Folder.userTree(req.user)
  res.send(R.ok(tree))
}
