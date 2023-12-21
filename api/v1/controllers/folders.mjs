/**
 * Folders controller module
 * @module controllers/folders
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaClient } from '@prisma/client'
import jsonschema from 'jsonschema'

import { randomId } from '../../../src/random.mjs'
import * as R from '../../../src/response.mjs'
import * as actions from '../../../src/action.mjs'
import * as Folder from '../../../model/folder.mjs'
import * as Group from '../../../model/group.mjs'
import * as Cache from '../../../src/cache.mjs'
import * as Config from '../../../src/config.mjs'
import * as Auth from '../../../src/auth.mjs'

const prisma = new PrismaClient(Config.get().prisma_options)

// Payload schema
const createSchema = {
  "id": "create",
  "type": "object",
  "properties": {
    "description" : { "type": "string" }
  },
  "required": ["description"]
}
const updateSchema = {
  "id": "update",
  "type": "object",
  "properties": {
    "description" : { "type": "string" },
    "parent" : { "type": "string" }
  },
  "required": ["description", "parent"]
}
const groupSchema = {
  "id": "addgroup",
  "type": "object",
  "properties": {
    "read" : { "type": "boolean" },
    "write" : { "type": "boolean" }
  },
  "required": ["read", "write"]
}

/**
 * Gets a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function get (req, res) {
  const id = req.params.id

  // Search folder
  if ( !await Folder.exists(id) ) {
    res.status(404).send(R.ko("Folder not found"))
    return
  }

  // Check permissions
  const perm = await Folder.permissions(id, req.user);
  if ( !perm.read ) {
    res.status(403).send(R.ko("Unauthorized"))
    return
  }

  // Reads folder
  const folder = await prisma.folders.findFirst({
    where: { id: id }
  })
  res.status(200).send(R.ok(folder))
}

/**
 * Creates a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function create(req, res) {
  // Validate payload
  const validate = jsonschema.validate(req.body, createSchema)
  if ( !validate.valid ) {
    res.status(400).send(R.ko("Bad request"))
    return
  }

  // Search parent folder
  if ( !Folder.exists(req.params.parent) ) {
    res.status(404).send(R.ko("Parent folder not found"))
    return
  }

  // Check write permissions on parent folder
  const perm = await Folder.permissions(req.params.parent, req.user);
  if ( !perm.write ) {
    res.status(403).send(R.ko("Unauthorized"))
    return
  }

  // Creates the folder
  const newid = randomId();
  await prisma.folders.create({
    data: {
      id: newid,
      description: req.body.description,
      parent: req.params.parent
    }
  })

  actions.log(req.user, "create", "folder", newid)
  Cache.reset("vaulted.tree")
  res.status(201).send(R.ok({id: newid}));
}

/**
 * Updates a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function update (req, res) {
  // Validate payload
  const validate = jsonschema.validate(req.body, updateSchema)
  if ( !validate.valid ) {
    res.status(400).send(R.ko("Bad request"))
    return
  }

  const id = req.params.id

  // Check for root folder
  if ( id=="0" ) {
    res.status(422).send(R.ko("Root folder cannot be updated"))
    return
  }

  // Search folder
  if ( !await Folder.exists(id) ) {
    res.status(404).send(R.ko("Folder not found"))
    return
  }

  // Search parent folder
  if ( !await Folder.exists(req.body.parent) ) {
    res.status(404).send(R.ko("Parent folder not found"))
    return
  }

  // Check write permissions on new parent folder
  const perm1 = await Folder.permissions(req.body.parent, req.user);
  if ( !perm1.write ) {
    res.status(403).send(R.ko("Unauthorized"))
    return
  }

  // Check write permissions on actual parent folder
  const parent = await Folder.parent(id);
  const perm2 = await Folder.permissions(parent.id, req.user);
  if ( !perm2.write ) {
    res.status(403).send(R.ko("Unauthorized"))
    return
  }

  // Update folder
  await prisma.folders.update({
    data: {
      description: req.body.description,
      parent: req.body.parent
    },
    where: {
      id: id
    }
  })

  actions.log(req.user, "update", "folder", id)
  Cache.reset("vaulted.tree")
  res.status(200).send(R.ok())
}

/**
 * Deletes a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function remove(req, res) {
  const id = req.params.id

  // Root folder cannot be deleted
  if ( id=="0" ) {
    res.status(422).send(R.ko("Root folder cannot be deleted"))
    return
  }

  // Personal folder root cannot be deleted
  if ( id=="P" ) {
    res.status(422).send(R.ko("Personal folders root cannot be deleted"))
    return
  }

  // Search folder
  if ( !await Folder.exists(id) ) {
    res.status(404).send(R.ko("Folder not found"))
    return
  }

  // Check write permissions on folder
  const perm = await Folder.permissions(id, req.user);
  if ( !perm.write ) {
    res.status(403).send(R.ko("Unauthorized"))
    return
  }

  // Search folder items
  const items = await prisma.items.findFirst({
    where: { folder: id }
  });
  if ( items!==null ) {
    res.status(422).send(R.ko("Folder not empty, items found"))
    return
  }

  // Search children folders
  const children = await prisma.folders.findFirst({
    where: { parent: id }
  });
  if ( children!==null ) {
    res.status(422).send(R.ko("Folder not empty, folders found"))
    return
  }

  // Deletes folder permissions
  await prisma.folderGroupPermission.deleteMany({
    where: { folder: id }
  })

  // Deletes folder
  await prisma.folders.delete({
    where: { id: id }
  })

  await actions.log(req.user, "delete", "folder", id)
  Cache.reset("vaulted.tree")
  res.status(200).send(R.ok('Done'))
}

/**
 * Add a group to a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function addGroup(req, res) {
  // Must be admin
  if ( !await Auth.isAdmin(req) ) {
    res.status(403).send(R.ko("Unauthorized"))
    return
  }

  // Checks for valid payload
  const validate = jsonschema.validate(req.body, groupSchema)
  if ( !validate.valid ) {
    res.status(400).send(R.ko("Bad request"))
    return
  }

  // Check for permissions
  if ( req.body.write && !req.body.read) {
    res.status(400).send(R.ko("If write is true, also read must be true"))
    return
  }

  // Checks the group
  if ( !await Group.exists(req.params.group) ) {
    res.status(404).send(R.ko("Group not found"))
    return
  }

  // Checks the folder
  if ( !await Folder.exists(req.params.folder) ) {
    res.status(404).send(R.ko("Folder not found"))
    return
  }

  // Checks is group is alread assigned
  const perm = await prisma.folderGroupPermission.findMany({
    where: {
      folder: req.params.folder,
      group: req.params.group
    }
  })
  if ( perm.length>0 ) {
    res.status(422).send(R.ko("Group is already associated to folder"))
    return
  }

  // Adds the permission
  const newId = randomId()
  await prisma.folderGroupPermission.create({
    data: {
      id: newId,
      group: req.params.group,
      folder: req.params.folder,
      read: req.body.read,
      write: req.body.write
    }
  })

  await actions.log(req.user, "add", "foldergroup", req.params.folder)
  Cache.reset("vaulted.tree")
  res.status(200).send(R.ok('Done'))
}

/**
 * Deletes a group from a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function removeGroup(req, res) {
  // Must be admin
  if ( !await Auth.isAdmin(req) ) {
    res.status(403).send(R.ko("Unauthorized"))
    return
  }

  // Checks the group
  if ( !await Group.exists(req.params.group) ) {
    res.status(404).send(R.ko("Group not found"))
    return
  }

  // Checks the folder
  if ( !await Folder.exists(req.params.folder) ) {
    res.status(404).send(R.ko("Folder not found"))
    return
  }

  // Checks is group is alread assigned
  const perm = await prisma.folderGroupPermission.findMany({
    where: {
      folder: req.params.folder,
      group: req.params.group
    }
  })
  if ( perm===null ) {
    res.status(422).send(R.ko("Group is not associated to folder"))
    return
  }

  await prisma.folderGroupPermission.deleteMany({
    where: {
      group: req.params.group,
      folder: req.params.folder
    }
  })

  await actions.log(req.user, "delete", "foldergroup", req.params.folder)
  Cache.reset("vaulted.tree")
  res.status(200).send(R.ok('Done'))
}

/**
 * Gets the tree of visible folders for current user
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function tree(req,res) {
  const tree = await Folder.tree(req.user);
  res.status(200).send(R.ok(tree))
}