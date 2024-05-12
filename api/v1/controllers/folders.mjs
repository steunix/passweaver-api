/**
 * Folders controller module
 * @module controllers/folders
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonschema from 'jsonschema'

import { newId } from '../../../lib/id.mjs'
import * as R from '../../../lib/response.mjs'
import * as actions from '../../../lib/action.mjs'
import * as Folder from '../../../model/folder.mjs'
import * as Group from '../../../model/group.mjs'
import * as Cache from '../../../lib/cache.mjs'
import * as Config from '../../../lib/config.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Const from '../../../lib/const.mjs'
import DB from '../../../lib/db.mjs'

// Payload schemas
const createSchema = {
  "id": "create",
  "type": "object",
  "properties": {
    "description" : { "type": "string", "maxLength": 100 }
  },
  "required": ["description"]
}
const updateSchema = {
  "id": "update",
  "type": "object",
  "properties": {
    "description" : { "type": "string", "maxLength": 100 },
    "parent" : { "type": "string", "maxLength": 30 }
  }
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
 * @param {Function} next Express next callback
 * @returns
 */
export async function get (req, res, next) {
  try {
    const id = req.params.id

    // Search folder
    const folder = await DB.folders.findFirst({
      where: { id: id }
    })
    if ( folder===null ) {
      res.status(404).send(R.ko("Folder not found"))
      return
    }

    // Check permissions
    const perm = await Folder.permissions(id, req.user);
    if ( !perm.read ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    // Add permissions to the payload
    folder.permissions = perm

    res.status(200).send(R.ok(folder))
  } catch ( err ) {
    next(err)
  }
}

/**
 * Creates a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function create(req, res, next) {
  try {
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

    // If leaf of a personal folder, it must be personal too
    const personal = await Folder.isPersonal(req.params.parent)

    // Creates the folder
    const newid = newId()
    await DB.folders.create({
      data: {
        id: newid,
        description: req.body.description,
        personal: personal,
        parent: req.params.parent,
        userid: personal ? req.user : null
      }
    })

    actions.log(req.user, "create", "folder", newid)
    Cache.resetFoldersTree()
    res.status(201).send(R.ok({id: newid}))
  } catch ( err ) {
    next(err)
  }
}

/**
 * Updates a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function update (req, res, next) {
  try {
    // Validate payload
    const validate = jsonschema.validate(req.body, updateSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    const id = req.params.id

    // Check for root folder
    if ( id==Const.PW_FOLDER_ROOTID ) {
      res.status(422).send(R.ko("Root folder cannot be updated"))
      return
    }

    // Check for Personal root folder
    if ( id==Const.PW_FOLDER_PERSONALROOTID ) {
      res.status(422).send(R.ko("Personal root folder cannot be updated"))
      return
    }

    // Search folder
    const folder = await DB.folders.findUnique({
      where: { id: id }
    });

    if ( !folder ) {
      res.status(404).send(R.ko("Folder not found"))
      return
    }

    // Personal folders roots cannot be altered, subfolders can
    if ( folder.personal && folder.parent==Const.PW_FOLDER_PERSONALROOTID ) {
      res.status(422).send(R.ko("Personal folders cannot be updated"))
      return
    }

    // Check write permissions on current folder
    const perm1 = await Folder.permissions(folder.id, req.user)
    if ( !perm1.write ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    // If parent is given, check for correctenns
    if ( req.body.parent ) {
      // Parent cannot be itself
      if ( req.body.parent == folder.id ) {
        res.status(422).send(R.ko("Parent folder is invalid"))
        return
      }

      // Search parent folder
      if ( !await Folder.exists(req.body.parent) ) {
        res.status(404).send(R.ko("Parent folder not found"))
        return
      }

      // Parent cannot be one of its current children, otherwise it would break the tree
      const children = await Folder.children(folder.id)
      if ( children.find( (elem)=> { return elem.id == req.body.parent} ) ) {
        res.status(422).send(R.ko("Parent folder is invalid"))
        return
      }

      // Check write permissions on new parent folder
      const perm2 = await Folder.permissions(req.body.parent, req.user);
      if ( !perm2.write ) {
        res.status(403).send(R.ko("Unauthorized"))
        return
      }
    }

    let updateStruct = {}
    if ( req.body.description ) {
      updateStruct.description = req.body.description
    }
    if ( req.body.parent ) {
      updateStruct.parent = req.body.parent
    }
    // Update folder
    await DB.folders.update({
      data: updateStruct,
      where: {
        id: id
      }
    })

    actions.log(req.user, "update", "folder", id)
    Cache.resetFoldersTree()
    res.status(200).send(R.ok())
  } catch (err) {
    next(err)
  }
}

/**
 * Deletes a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function remove(req, res, next) {
  try {
    const id = req.params.id

    // Root folder cannot be deleted
    if ( id==Const.PW_FOLDER_ROOTID ) {
      res.status(422).send(R.ko("Root folder cannot be deleted"))
      return
    }

    // Personal folder root cannot be deleted
    if ( id==Const.PW_FOLDER_PERSONALROOTID ) {
      res.status(422).send(R.ko("Personal folders root cannot be deleted"))
      return
    }

    // Search folder
    const folder = await DB.folders.findUnique({
      where: { id: id }
    })
    if ( !folder ) {
      res.status(404).send(R.ko("Folder not found"))
      return
    }

    // Personal folders roots cannot be removed, subfolders can
    if ( folder.personal && folder.parent==Const.PW_FOLDER_PERSONALROOTID) {
      res.status(422).send(R.ko("Personal folders cannot be deleted"))
      return
    }

    // Check write permissions on folder
    const perm = await Folder.permissions(id, req.user);
    if ( !perm.write ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    // Search folder items
    const items = await DB.items.findFirst({
      where: { folderid: id }
    });
    if ( items!==null ) {
      res.status(422).send(R.ko("Folder not empty, items found"))
      return
    }

    // Search children folders
    const children = await DB.folders.findFirst({
      where: { parent: id }
    });
    if ( children!==null ) {
      res.status(422).send(R.ko("Folder not empty, subfolders found"))
      return
    }

    // Deletes folder permissions
    await DB.folderspermissions.deleteMany({
      where: { folderid: id }
    })

    // Deletes folder
    await DB.folders.delete({
      where: { id: id }
    })

    actions.log(req.user, "delete", "folder", id)
    Cache.resetFoldersTree()
    res.status(200).send(R.ok('Done'))
  } catch (err) {
    next(err)
  }
}

/**
 * Add a group to a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function addGroup(req, res, next) {
  try {
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
    const perm = await DB.folderspermissions.findMany({
      where: {
        folderid: req.params.folder,
        groupid: req.params.group
      }
    })
    if ( perm.length>0 ) {
      res.status(422).send(R.ko("Group is already associated to folder"))
      return
    }

    // Adds the permission
    const newid = newId()
    await DB.folderspermissions.create({
      data: {
        id: newid,
        groupid: req.params.group,
        folderid: req.params.folder,
        read: req.body.read,
        write: req.body.write
      }
    })

    actions.log(req.user, "add", "foldergroup", req.params.folder)
    Cache.resetFoldersTree()
    res.status(200).send(R.ok('Done'))
  } catch (err) {
    next(err)
  }
}

/**
 * Set group permissions
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function setGroup(req, res, next) {
  try {
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
    const perm = await DB.folderspermissions.findFirst({
      where: {
        folderid: req.params.folder,
        groupid: req.params.group
      }
    })
    if ( perm.length==0 ) {
      res.status(422).send(R.ko("Group is not associated to folder"))
      return
    }

    // Adds the permission
    await DB.folderspermissions.update({
      where: { id: perm.id },
      data: {
        read: req.body.read,
        write: req.body.write
      }
    })

    actions.log(req.user, "set", "foldergroup", req.params.folder)
    Cache.resetFoldersTree()
    res.status(200).send(R.ok('Done'))
  } catch (err) {
    next(err)
  }
}

/**
 * Deletes a group from a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function removeGroup(req, res, next) {
  try {
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
    const perm = await DB.folderspermissions.findMany({
      where: {
        folderid: req.params.folder,
        groupid: req.params.group
      }
    })
    if ( perm===null ) {
      res.status(422).send(R.ko("Group is not associated to folder"))
      return
    }

    // Admins group cannot be removed from Root group
    if ( req.params.group==Const.PW_GROUP_ADMINSID && req.params.folder==Const.PW_FOLDER_ROOTID ) {
      res.status(422).send(R.ko("Admins cannot be removed from root folder"))
      return
    }

    await DB.folderspermissions.deleteMany({
      where: {
        groupid: req.params.group,
        folderid: req.params.folder
      }
    })

    actions.log(req.user, "delete", "foldergroup", req.params.folder)
    Cache.resetFoldersTree()
    res.status(200).send(R.ok('Done'))
  } catch (err) {
    next(err)
  }
}

/**
 * Get groups associated to a folder
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Object} next Next
 * @returns
 */
export async function groups(req,res,next) {
  try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    // Checks the folder
    if ( !await Folder.exists(req.params.id) ) {
      res.status(404).send(R.ko("Folder not found"))
      return
    }

    // Get folders parents
    const parents = await Folder.parents(req.params.id, true)
    const perms = new Map()
    const canmodify = !parents[0].personal && parents[0].id!=Const.PW_FOLDER_PERSONALROOTID

    // For each folder, group permissions are OR'ed
    for ( const folder of parents ) {
      const groups = await DB.folderspermissions.findMany({
        where: {
          folderid: folder.id
        },
        include: {
          groups: {},
          folders: {}
        }
      })

      for ( const group of groups ) {
        var perm = perms.get(group.id) ?? { id: '', description: '', canmodify: false, inherited: false, read: false, write: false }
        perm.id = group.groups.id
        perm.canmodify = canmodify
        perm.description = group.groups.description
        perm.inherited = ( group.folderid != req.params.id)
        perm.read |= group.read
        perm.write |= group.write
        perms.set(group.id, perm)
      }
    }

    // Create array from map
    var groups = Array.from(perms.values())

    // Filter unique inherited values
    groups = groups.filter( (obj,index)=>{
      let idx = groups.findIndex( (item)=> { return item.inherited===obj.inherited && item.description===obj.description && item.read===obj.read && item.write===obj.write } )
      return idx === index
    })

    groups.sort((a,b)=>{
      if ( a.description<b.description ) { return -1 }
      if ( a.description>b.description ) { return 1 }
      return 0
    })

    res.status(200).send(R.ok(groups))
  } catch (err) {
    next(err)
  }
}

/**
 * Gets the tree of visible folders for current user
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function tree(req,res,next) {
  try {
    const tree = await Folder.tree(req.user);
    res.status(200).send(R.ok(tree))
  } catch (err) {
    next(err)
  }
}