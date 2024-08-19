/**
 * Items controller module
 * @module controllers/items
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonschema from 'jsonschema'

import { newId } from '../../../lib/id.mjs'
import * as R from '../../../lib/response.mjs'
import * as actions from '../../../lib/action.mjs'
import * as Folder from '../../../model/folder.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import * as Cache from '../../../lib/cache.mjs'
import * as Const from '../../../lib/const.mjs'
import { isAdmin } from '../../../lib/auth.mjs'
import DB from '../../../lib/db.mjs'

// Payload schemas
const createSchema = {
  "id": "create",
  "properties": {
    "type" : { "type": "string", "maxLength": 30},
    "title" : { "type": "string", "maxLength": 200 },
    "data" : { "type": "string" },
    "metadata": { "type": "string" }
  },
  "required": ["title","data","metadata"]
}
const updateSchema = {
  "id": "update",
  "properties": {
    "type" : { "type": "string", "maxLength": 30},
    "title" : { "type": "string", "maxLength": 200 },
    "data" : { "type": "string" },
    "metadata": { "type": "string" },
    "folder" : { "type": "string", "maxLength": 30 }
  }
}

/**
 * Check if a personal secret has been set or used in a given session
 * @param {*} req Express request
 * @returns
 */
async function checkPersonalAccess(req) {
  // User has used its personal secret
  if ( req?.personalfolderunlocked ) {
    return 0
  }

  const user = await DB.users.findUnique({
    where: { id: req.user }
  })

  // User has not defined its personal secret
  if ( user.personalsecret===null ) {
    return 412
  }

  // User has not used its personal secret
  if ( req?.personalfolderunlocked === false ) {
    return 417
  }

  return 500
}

/**
 *
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function get(req, res, next) {
  try {
    const id = req.params.id

    // Admins have no access to items
    if ( await isAdmin(req) ) {
      res.status(403).send(R.forbidden())
      return
    }

    // Search item
    const item = await DB.items.findUnique({
      where: { id: id }
    })

    if ( item===null ) {
      res.status(404).send(R.ko("Item not found"))
      return
    }

    // If personal item, ensure personal password has been set and activated
    if ( item.personal ) {
      const check = await checkPersonalAccess(req)
      if ( check!=0 ) {
        res.status(check).send(R.ko("Personal folder not accessible"))
        return
      }
    }

    // Check read permissions on folder
    const perm = await Folder.permissions(item.folderid, req.user)
    if ( !perm.read ) {
      res.status(403).send(R.forbidden())
      return
    }

    // Decrypt content
    item.data = JSON.parse(Crypt.decrypt(item.data, item.dataiv, item.dataauthtag))

    // Removes unneeded info
    delete(item.dataauthtag)
    delete(item.dataiv)

    // Update last accessed on item
    await DB.items.update({
      data: {
        accessedat: new Date()
      },
      where: {
        id: id
      }
    })

    actions.log(req.user, "read", "item", id)
    res.status(200).send(R.ok(item))
  } catch (err) {
    next(err)
  }
}

/**
 * Get folder items list
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function list(req, res, next) {
  try {
    // Admins have no access to items
    if ( await isAdmin(req) ) {
      res.status(403).send(R.forbidden())
      return
    }

    const folder = req.params?.folder
    const search = req.query?.search ?? ''
    const type = req.query?.type ?? ''

    var items, folders

    if ( folder ) {
      // Single folder search, if from .../folder/items
      if ( !await Folder.exists(folder) ) {
        res.status(404).send(R.ko("Folder not found"))
        return
      }

      // Check read permissions on folder
      const perm = await Folder.permissions(folder, req.user)
      if ( !perm.read ) {
        res.status(403).send(R.forbidden())
        return
      }

      const fld = await DB.folders.findUnique({
        where: { id: folder }
      })

      // Admin can see all folders, but cannot access any personal folder
      if ( fld.personal && req.user===Const.PW_USER_ADMINID ) {
        res.status(403).send(R.forbidden())
        return
      }

      // If personal folder, ensure personal password has been set and activated
      if ( fld.personal ) {
        const check = await checkPersonalAccess(req)
        if ( check!=0 ) {
          res.status(check).send(R.ko("Personal folder not accessible"))
          return
        }
      }

      folders = [ req.params.folder ]
    } else {
      // If no folder is specified, get authorized folders from cache
      folders = await Cache.get(req.user, Cache.foldersReadableKey)
      if ( !folders ) {
        await Folder.tree(req.user)
        folders = await Cache.get(req.user, Cache.foldersReadableKey)
      }
    }

    // Split search string and create array for later AND
    let contains = []
    if ( search!='' ) {
      let searchTokens = search.split(' ')
      for ( const token of searchTokens ) {
        contains.push( { OR: [
          { title: { contains: token, mode: 'insensitive'} },
          { metadata: { contains: token, mode: 'insensitive'} }
        ]})
      }
    }

    // Search folder
    const folderList = folders.map(folders=>folders)

    // Build search filter
    let queryFilter = [
      { folderid: { in: folderList } },
      { AND: contains }
    ]

    if ( type!='' ) {
      queryFilter.push({type: type})
    }

    items = await DB.items.findMany({
      where: {
        AND: queryFilter
      },
      select: {
        id: true,
        folderid: true,
        type: true,
        title: true,
        metadata: true,
        createdat: true,
        updatedat: true,
        folder: {
          select: {
            description: true
          }
        },
        itemtype: true,
      },
      orderBy: {
        title: "asc"
      }
    })

    if ( items.length==0 ) {
      res.status(404).send(R.ko("No item found"))
      return
    }

    res.status(200).send(R.ok(items))
  } catch (err) {
    next(err)
  }
}

/**
 * Create an item
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function create(req, res, next) {
  try {
      // Admins have no access to items
      if ( await isAdmin(req) ) {
        res.status(403).send(R.forbidden())
        return
      }

    // Validate payload
    const validate = jsonschema.validate(req.body, createSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.badRequest())
      return
    }

    const folder = req.params.folder

    // Search folder
    if ( !await Folder.exists(folder) ) {
      res.status(404).send(R.ko("Folder not found"))
      return
    }

    // No items on root or personal folders root
    if ( folder==Const.PW_FOLDER_PERSONALROOTID || folder==Const.PW_FOLDER_ROOTID ) {
      res.status(401).send(R.ko("You cannot create items in this folder"))
      return
    }

    // Check write permissions on folder
    const perm = await Folder.permissions(folder, req.user)
    if ( !perm.write ) {
      res.status(401).send(R.ko("Unauthorized"))
      return
    }

    // Check if personal
    var personal = false
    if ( await Folder.isPersonal(folder) ) {
      const check = await checkPersonalAccess(req)
      if ( check!=0 ) {
        res.status(check).send(R.ko("Personal folder not accessible"))
        return
      }

      personal = true
    }

    // If type is specified, check that it exists
    if ( req?.body?.type ) {
      const itemtype = await DB.itemtypes.findUnique({
        where: { id: req.body.type }
      })
      if ( itemtype===null ) {
        res.status(422).send(R.ko("Specified type does not exist"))
        return
      }
    }

    // Encrypt data
    const encData = Crypt.encrypt(req.body.data)

    // Creates the item
    const newid = newId()
    await DB.items.create({
      data: {
        id: newid,
        folderid: folder,
        personal: personal,
        title: req.body.title,
        type: req?.body?.type || null,
        algo: encData.algo,
        data: encData.encrypted,
        dataiv: encData.iv,
        dataauthtag: encData.authTag,
        metadata: req.body.metadata
      }
    })

    actions.log(req.user, "create", "item", newid)
    res.status(201).send(R.ok({id: newid}))
  } catch (err) {
    next(err)
  }
}

/**
 * Updates an item
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function update(req, res, next) {
  try {
    // Admins have no access to items
    if ( await isAdmin(req) ) {
      res.status(403).send(R.forbidden())
      return
    }

    // Validate payload
    const validate = jsonschema.validate(req.body, updateSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.badRequest())
      return
    }

    const id = req.params.id

    // Search item
    const item = await DB.items.findUnique({
      where: { id: id }
    })

    if ( item===null ) {
      res.status(404).send(R.ko("Item not found"))
      return
    }

    const folderFromURL = req.params.folder ?? req.body.folder

    // Check write permissions on current folder
    const perm1 = await Folder.permissions(item.folderid, req.user)
    if ( !perm1.write ) {
      res.status(403).send(R.forbidden())
      return
    }

    // If a folder is given through path or payload, check for existance and permissions
    if ( folderFromURL ) {
      if ( !await Folder.exists(folderFromURL) ) {
        res.status(404).send(R.ko("Folder not found"))
        return
      }

      const perm2 = await Folder.permissions(folderFromURL, req.user)
      if ( !perm2.write ) {
        res.status(403).send(R.forbidden())
        return
      }
    }

    // If personal item, ensure personal password has been set and activated
    if ( item.personal ) {
      const check = await checkPersonalAccess(req)
      if ( check!=0 ) {
        res.status(check).send(R.ko("Personal folder not accessible"))
        return
      }
    }

    // If type is specified, check that it exists
    if ( req?.body?.type ) {
      const itemtype = await DB.itemtypes.findUnique({
        where: { id: req.body.type }
      })
      if ( itemtype===null ) {
        res.status(422).send(R.ko("Specified type does not exist"))
        return
      }
    }

    // Updates
    let updateStruct = {}
    if ( req.body.data ) {
      const encData = Crypt.encrypt(req.body.data)
      updateStruct.algo = encData.algo,
      updateStruct.data = encData.encrypted
      updateStruct.dataiv = encData.iv
      updateStruct.dataauthtag = encData.authTag
    }
    if ( folderFromURL ) {
      updateStruct.folderid = folderFromURL
    }
    if ( req.body.title ) {
      updateStruct.title = req.body.title
    }
    if ( req.body.hasOwnProperty("metadata") ) {
      updateStruct.metadata = req.body.metadata || null
    }
    if ( req.body.hasOwnProperty("type") ) {
      updateStruct.type = req.body.type || null
    }
    await DB.items.update({
      data: updateStruct,
      where: {
        id: id
      }
    })

    actions.log(req.user, "update", "item", id)
    res.status(200).send(R.ok())
  } catch (err) {
    next(err)
  }
}

/**
 * Deletes an item
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function remove(req, res, next) {
  try {
    // Admins have no access to items
    if ( await isAdmin(req) ) {
      res.status(403).send(R.forbidden())
      return
    }

    const id = req.params.id

    // Search item
    const item = await DB.items.findUnique({
      where: { id: id }
    })

    if ( item===null ) {
      res.status(404).send(R.ko("Item not found"))
      return
    }

    // Search folder
    const folder = await DB.folders.findUnique({
      where: { id: item.folderid }
    })

    if ( folder===null ) {
      res.status(404).send(R.ko("Folder not found"))
      return
    }

    // Check write permissions on folder
    const perm = await Folder.permissions(item.folderid, req.user)
    if ( !perm.write ) {
      res.status(401).send(R.ko("Unauthorized"))
      return
    }

    // If personal item, ensure personal password has been set and activated
    if ( item.personal ) {
      const check = await checkPersonalAccess(req)
      if ( check!=0 ) {
        res.status(check).send(R.ko("Personal folder not accessible"))
        return
      }
    }

    // Delete item and move it to deleted items table
    await DB.$transaction(async(tx)=> {
      await DB.itemsdeleted.create({
        data: item
      })

      await DB.items.delete({
        where: {
          id: id
        }
      })
    })

    actions.log(req.user, "delete", "item", id)
    res.status(200).send(R.ok('Done'))
  } catch (err) {
    next(err)
  }
}

/**
 * Clone an item
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function clone(req, res, next) {
  try {
    // Admins have no access to items
    if ( await isAdmin(req) ) {
      res.status(403).send(R.forbidden())
      return
    }

    const id = req.params.id

    // Search item
    const item = await DB.items.findUnique({
      where: { id: id }
    })

    if ( item===null ) {
      res.status(404).send(R.ko("Item not found"))
      return
    }

    // Check write permissions on folder
    const perm = await Folder.permissions(item.folderid, req.user)
    if ( !perm.write ) {
      res.status(401).send(R.ko("Unauthorized"))
      return
    }

    // If personal item, ensure personal password has been set and activated
    if ( item.personal ) {
      const check = await checkPersonalAccess(req)
      if ( check!=0 ) {
        res.status(check).send(R.ko("Personal folder not accessible"))
        return
      }
    }

    // Reencrypt data
    var oldData = Crypt.decrypt(item.data, item.dataiv, item.dataauthtag)
    var newData = Crypt.encrypt(oldData)

    // Creates the item
    const newid = newId()
    var newItem = {
      id: newid,
      folderid: item.folderid,
      title: `${item.title} - Copy`,
      type: item.type,
      algo: newData.algo,
      data: newData.encrypted,
      dataiv: newData.iv,
      dataauthtag: newData.authTag,
      metadata: item.metadata
    }

    await DB.items.create({
      data: newItem
    })

    actions.log(req.user, "clone", "item", id)
    actions.log(req.user, "create", "item", newid)
    res.status(201).send(R.ok({id: newid}))
  } catch (err) {
    next(err)
  }
}