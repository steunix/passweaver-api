/**
 * Items controller module
 * @module controllers/items
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaClient } from '@prisma/client'
import jsonschema from 'jsonschema'

import { newId } from '../../../src/id.mjs'
import * as R from '../../../src/response.mjs'
import * as actions from '../../../src/action.mjs'
import * as Config from '../../../src/config.mjs'
import * as Folder from '../../../model/folder.mjs'
import * as Crypt from '../../../src/crypt.mjs'
import * as Cache from '../../../src/cache.mjs'

const prisma = new PrismaClient(Config.get().prisma_options)

// Payload schema
const createSchema = {
  "id": "create",
  "properties": {
    "type" : { "type": "string"},
    "title" : { "type": "string" },
    "data" : { "type": "string" },
    "metadata": { "type": "string" }
  },
  "required": ["title","data","metadata"]
}
const updateSchema = {
  "id": "update",
  "properties": {
    "type" : { "type": "string"},
    "title" : { "type": "string" },
    "data" : { "type": "string" },
    "metadata": { "type": "string" },
    "folder" : { "type": "string" }
  }
}

// Get an item
export async function get(req, res, next) {
  try {
    const id = req.params.id

    // Search item
    const item = await prisma.items.findUnique({
      where: { id: id }
    })

    if ( item===null ) {
      res.status(404).send(R.ko("Item not found"))
      return
    }

    // If personal item, ensure personal password has been set and activated
    if ( item.personal && !req.personalfolder ) {
      const user = await prisma.users.findUnique({
        where: { id: req.user }
      })

      var retcode = 417
      if ( user.personalsecret===null ) {
        retcode = 412
      }
      res.status(retcode).send(R.ko("Personal folder not accessible"))
      return
    }

    // Check read permissions on folder
    const perm = await Folder.permissions(item.folder, req.user)
    if ( !perm.read ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    // Decrypt content
    item.data = JSON.parse(Crypt.decrypt(item.data, item.dataiv, item.dataauthtag))

    // Removes unneeded info
    delete(item.dataauthtag)
    delete(item.dataiv)

    // Update last accessed on item
    await prisma.items.update({
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
 * Get folder items
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function list(req, res, next) {
  try {
    const folder = req.params?.folder
    const search = req.query?.search ?? ''

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
        res.status(403).send(R.ko("Unauthorized"))
        return
      }

      const fld = await prisma.folders.findUnique({
        where: { id: folder }
      })

      // Admin can see all folders, but cannot access any personal folder
      if ( fld.personal && req.user==="0" ) {
        res.status(403).send(R.ko("Unauthorized"))
        return
      }

      // If personal folder, ensure personal password has been set and activated
      if ( fld.personal && !req.personalfolder ) {
        const user = await prisma.users.findUnique({
          where: { id: req.user }
        })

        var retcode = 417
        if ( user.personalsecret===null ) {
          retcode = 412
        }
        res.status(retcode).send(R.ko("Personal folder not accessible"))
        return
      }

      folders = [ req.params.folder ]
    } else {
      // If no folder is specified, get authorized folders from cache
      folders = Cache.get(req.user, Cache.foldersReadableKey)
      if ( !folders ) {
        await Folder.tree(req.user)
        folders = Cache.get(req.user, Cache.foldersReadableKey)
      }
    }

    // Split search string and create array for later AND
    let searchTokens = search.split(' ')
    let contains = []
    for ( const token of searchTokens ) {
      contains.push( { OR: [
        { title: { contains: token, mode: 'insensitive'} },
        { metadata: { contains: token, mode: 'insensitive'} }
      ]})
    }

    // Search folder
    const folderList = folders.map(folders=>folders)
    items = await prisma.items.findMany({
      where: {
        AND: [
          { folder: { in: folderList } },
          { AND: contains }
        ]
      },
      select: {
        id: true,
        folder: true,
        type: true,
        title: true,
        metadata: true,
        createdat: true,
        updatedat: true,
        folderInfo: {
          select: {
            description: true
          }
        }
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

    const folder = req.params.folder

    // Search folder
    if ( !await Folder.exists(folder) ) {
      res.status(404).send(R.ko("Folder not found"))
      return
    }

    // No items on root or personal folders root
    if ( folder=="P" || folder=="0" ) {
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
      // If personal folder, ensure personal password has been set and activated
      if ( !req.personalfolder ) {
        const user = await prisma.users.findUnique({
          where: { id: req.user }
        })

        var retcode = 417
        if ( user.personalsecret===null ) {
          retcode = 412
        }
        res.status(retcode).send(R.ko("Personal folder not accessible"))
        return
      }

      personal = true
    }

    // Encrypt data
    const encData = Crypt.encrypt(req.body.data)

    // Creates the item
    const newid = newId()
    await prisma.items.create({
      data: {
        id: newid,
        folder: folder,
        personal: personal,
        title: req.body.title,
        type: req?.body?.type,
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
 * @returns
 */
export async function update(req, res, next) {
  try {
    // Validate payload
    const validate = jsonschema.validate(req.body, updateSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    const id = req.params.id

    // Search item
    const item = await prisma.items.findUnique({
      where: { id: id }
    })

    if ( item===null ) {
      res.status(404).send(R.ko("Item not found"))
      return
    }

    const folderFromURL = req.params.folder ?? req.body.folder

    // Check write permissions on current folder
    const perm1 = await Folder.permissions(item.folder, req.user)
    if ( !perm1.write ) {
      res.status(403).send(R.ko("Unauthorized"))
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
        res.status(401).send(R.ko("Unauthorized"))
        return
      }
    }

    // If personal item, ensure personal password has been set and activated
    if ( item.personal && !req.personalfolder ) {
      const user = await prisma.users.findUnique({
        where: { id: req.user }
      })

      var retcode = 417
      if ( user.personalsecret===null ) {
        retcode = 412
      }
      res.status(retcode).send(R.ko("Personal folder not accessible"))
      return
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
      updateStruct.folder = folderFromURL
    }
    if ( req.body.title ) {
      updateStruct.title = req.body.title
    }
    if ( req.body.metadata ) {
      updateStruct.metadata = req.body.metadata
    }
    if ( req.body.type ) {
      updateStruct.type = req.body.type
    }
    await prisma.items.update({
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
 * @returns
 */
export async function remove(req, res, next) {
  try {
    const id = req.params.id

    // Search item
    const item = await prisma.items.findUnique({
      where: { id: id }
    })

    if ( item===null ) {
      res.status(404).send(R.ko("Item not found"))
      return
    }

    // Search folder
    const folder = await prisma.folders.findUnique({
      where: { id: item.folder }
    })

    if ( folder===null ) {
      res.status(404).send(R.ko("Folder not found"))
      return
    }

    // Check write permissions on folder
    const perm = await Folder.permissions(item.folder, req.user)
    if ( !perm.write ) {
      res.status(401).send(R.ko("Unauthorized"))
      return
    }

    // If personal item, ensure personal password has been set and activated
    if ( item.personal && !req.personalfolder ) {
      const user = await prisma.users.findUnique({
        where: { id: req.user }
      })

      var retcode = 417
      if ( user.personalsecret===null ) {
        retcode = 412
      }
      res.status(retcode).send(R.ko("Personal folder not accessible"))
      return
    }

    // Deletes item
    await prisma.items.delete({
      where: {
        id: id
      }
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
 * @returns
 */
export async function clone(req, res, next) {
  try {
    const id = req.params.id

    // Search item
    const item = await prisma.items.findUnique({
      where: { id: id }
    })

    if ( item===null ) {
      res.status(404).send(R.ko("Item not found"))
      return
    }

    // Check write permissions on folder
    const perm = await Folder.permissions(item.folder, req.user)
    if ( !perm.write ) {
      res.status(401).send(R.ko("Unauthorized"))
      return
    }

    // If personal item, ensure personal password has been set and activated
    if ( item.personal && !req.personalfolder ) {
      const user = await prisma.users.findUnique({
        where: { id: req.user }
      })

      var retcode = 417
      if ( user.personalsecret===null ) {
        retcode = 412
      }
      res.status(retcode).send(R.ko("Personal folder not accessible"))
      return
    }

    // Reencrypt data
    var oldData = Crypt.decrypt(item.data, item.dataiv, item.dataauthtag)
    var newData = Crypt.encrypt(oldData)

    // Creates the item
    const newid = newId()
    var newItem = {
      id: newid,
      folder: item.folder,
      title: `${item.title} - Copy`,
      type: item.type,
      algo: newData.algo,
      data: newData.encrypted,
      dataiv: newData.iv,
      dataauthtag: newData.authTag,
      metadata: item.metadata
    }

    await prisma.items.create({
      data: newItem
    })

    actions.log(req.user, "clone", "item", id)
    actions.log(req.user, "create", "item", newid)
    res.status(201).send(R.ok({id: newid}))
  } catch (err) {
    next(err)
  }
}