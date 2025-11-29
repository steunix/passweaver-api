/**
 * Groups controller module
 * @module controllers/groups
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { newId } from '../../../lib/id.mjs'
import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Group from '../../../model/group.mjs'
import * as User from '../../../model/user.mjs'
import * as Cache from '../../../lib/cache.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Const from '../../../lib/const.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'
import * as Folder from '../../../model/folder.mjs'

import { isReadOnly } from '../../../lib/auth.mjs'
import DB from '../../../lib/db.mjs'

/**
 * Get a group
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function get (req, res, next) {
  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  const groupid = req.params.id

  // Search folder
  const group = await DB.groups.findUnique({
    where: { id: groupid }
  })

  if (group === null) {
    res.status(R.NOT_FOUND).send(R.ko('Group not found'))
    return
  }

  res.send(R.ok(group))
}

/**
 * Get groups list
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function list (req, res, next) {
  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Search group
  let groups
  if (req.query?.search) {
    groups = await DB.groups.findMany({
      where: {
        description: { contains: req.query.search, mode: 'insensitive' }
      },
      orderBy: {
        description: 'asc'
      }
    })
  } else {
    groups = await DB.groups.findMany({
      orderBy: {
        description: 'asc'
      }
    })
  }

  res.send(R.ok(groups))
}

/**
 * Get group members
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function getUsers (req, res, next) {
  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  const id = req.params.id

  // Search group members
  const users = await DB.groupsmembers.findMany({
    where: { groupid: id },
    select: {
      users: {
        select: {
          id: true,
          login: true,
          lastname: true,
          firstname: true,
          locale: true,
          authmethod: true,
          active: true,
          createdat: true,
          updatedat: true
        }
      }
    },
    orderBy: {
      users: {
        lastname: 'asc'
      }
    }
  })

  const data = []
  for (const user of users) {
    data.push(user.users)
  }

  res.send(R.ok(data))
}

/**
 * Create a group
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

  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Validate payload
  if (!JV.validate(req.body, 'group_create')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // Search parent
  if (!await Group.exists(req.params.parent)) {
    res.status(R.NOT_FOUND).send(R.ko('Parent group not found'))
    return
  }

  if (req.params.parent === Const.PW_GROUP_EVERYONEID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Cannot create groups in Everyone group'))
    return
  }

  // Creates group
  const newid = newId()
  await DB.groups.createMany({
    data: [{
      id: newid,
      description: req.body.description,
      parent: req.params.parent
    }]
  })

  // Tree cache doesn't need to be reset, because the group is empty
  await Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_GROUP, newid)

  await Cache.resetGroupsTree()
  res.status(R.CREATED).send(R.ok({ id: newid }))
}

/**
 * Update a group
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

  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Validate payload
  if (!JV.validate(req.body, 'group_update')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  const groupid = req.params.id

  // Check for root group
  if (groupid === Const.PW_GROUP_ROOTID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Root group cannot be modified'))
    return
  }

  // Check for Admins group
  if (groupid === Const.PW_GROUP_ADMINSID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Admins group cannot be modified'))
    return
  }

  // Check for Everyone group
  if (groupid === Const.PW_GROUP_EVERYONEID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Everyone group cannot be modified'))
    return
  }

  // Search group
  if (!await Group.exists(groupid)) {
    res.status(R.NOT_FOUND).send(R.ko('Group not found'))
    return
  }

  const groupFromURL = req.params.parent || req.body.parent

  // Search parent group
  if (groupFromURL) {
    if (!await Group.exists(groupFromURL)) {
      res.status(R.NOT_FOUND).send(R.ko('Parent group not found'))
      return
    }

    // New parent cannot be one of its current children, otherwise it would break the tree
    const group = await DB.groups.findUnique({
      where: { id: groupid },
      select: { id: true }
    })

    const children = await Group.children(group.id)
    if (children.find((elem) => { return elem.id === req.body.parent })) {
      res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Parent group is invalid'))
      return
    }
  }

  const updateStruct = {}
  if (req.body.description) {
    updateStruct.description = req.body.description
  }
  if (groupFromURL) {
    updateStruct.parent = groupFromURL
  }

  // Update group
  await DB.groups.updateMany({
    data: updateStruct,
    where: {
      id: groupid
    }
  })

  await Events.add(req.user, Const.EV_ACTION_UPDATE, Const.EV_ENTITY_GROUP, groupid)
  await Cache.resetFoldersTree()
  await Cache.resetGroupsTree()
  res.send(R.ok())
}

/**
 * Delete a group
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

  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  const groupid = req.params.id

  // Root group cannot be deleted
  if (groupid === Const.PW_GROUP_ROOTID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Root group cannot be deleted'))
    return
  }

  // Everyone group cannot be deleted
  if (groupid === Const.PW_GROUP_EVERYONEID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Root group cannot be deleted'))
    return
  }

  // Everyone group cannot be deleted
  if (groupid === Const.PW_GROUP_ADMINSID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Admins group cannot be deleted'))
    return
  }

  // Gets the group
  if (!await Group.exists(groupid)) {
    res.status(R.NOT_FOUND).send(R.ko('Group not found'))
    return
  }

  // Looks for children groups
  const children = await DB.groups.findFirst({
    where: { parent: groupid }
  })
  if (children !== null) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Group not empty'))
    return
  }

  // Looks for members
  const members = await DB.groupsmembers.findFirst({
    where: { groupid },
    select: { id: true }
  })
  if (members !== null) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Group has members'))
    return
  }

  // Delete user/groups
  await DB.$transaction(async (tx) => {
    await DB.groupsmembers.deleteMany({
      where: {
        groupid
      }
    })

    // Delete folder/groups
    await DB.folderspermissions.deleteMany({
      where: {
        groupid
      }
    })

    // Delete group
    await DB.groups.delete({
      where: {
        id: groupid
      }
    })
  })

  await Events.add(req.user, Const.EV_ACTION_DELETE, Const.EV_ENTITY_GROUP, groupid)
  await Cache.resetFoldersTree()
  await Cache.resetGroupsTree()
  res.send(R.ok())
}

/**
 * Add a user to a group
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function addUser (req, res, next) {
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

  const group = req.params.group
  const user = req.params.user

  // Checks the group
  if (!await Group.exists(group)) {
    res.status(R.NOT_FOUND).send(R.ko('Group not found'))
    return
  }

  // Cannot add user to Everyone
  if (group === Const.PW_GROUP_EVERYONEID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Cannot add users to Everyone group'))
    return
  }

  // Cannot add user to Root group
  if (group === Const.PW_GROUP_ROOTID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Cannot add users to Root group'))
    return
  }

  // Checks the user
  if (!await User.exists(user)) {
    res.status(R.NOT_FOUND).send(R.ko('User not found'))
    return
  }

  // Checks if already associated
  const ex = await DB.groupsmembers.findFirst({
    where: {
      groupid: group,
      userid: user
    },
    select: { id: true }
  })
  if (ex !== null) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('User is already in the group'))
    return
  }

  await DB.groupsmembers.createMany({
    data: [{
      groupid: group,
      userid: user
    }]
  })

  await Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_GROUPMEMBERS, group, user)

  await Cache.resetFoldersTree(user)
  res.send(R.ok())
}

/**
 * Remove a user from a group
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function removeUser (req, res, next) {
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

  const group = req.params.group
  const user = req.params.user

  // Checks the group
  if (!await Group.exists(group)) {
    res.status(R.NOT_FOUND).send(R.ko('Group not found'))
    return
  }

  // Checks the user
  if (!await User.exists(user)) {
    res.status(R.NOT_FOUND).send(R.ko('User not found'))
    return
  }

  // Admin cannot be removed from Admins
  if (group === Const.PW_GROUP_ADMINSID && user === Const.PW_USER_ADMINID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Admin cannot be removed from Admins group'))
    return
  }

  // Cannot remove user from Everyone
  if (group === Const.PW_GROUP_EVERYONEID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Cannot remove users from Everyone group'))
    return
  }

  // Checks if associated
  const ex = await DB.groupsmembers.findFirst({
    where: {
      groupid: group,
      userid: user
    },
    select: { id: true }
  })
  if (ex === null) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('User is not in the group'))
    return
  }

  await DB.groupsmembers.delete({
    where: {
      id: ex.id
    }
  })

  await Events.add(req.user, Const.EV_ACTION_DELETE, Const.EV_ENTITY_GROUPMEMBERS, group, user)

  await Cache.resetFoldersTree(user)
  res.send(R.ok())
}

/**
 * Get the tree structure of groups
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function tree (req, res, next) {
  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  const tree = await Group.tree(req.user)
  res.send(R.ok(tree))
}

/**
 * Get the tree of visible folders for the user
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function folders (req, res, next) {
  // Only admin can query groups
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  const tree = await Folder.groupTree(req.params.id)
  res.send(R.ok(tree))
}
