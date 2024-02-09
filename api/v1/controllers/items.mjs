/**
 * Items controller module
 * @module controllers/items
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaClient } from '@prisma/client'
import jsonschema from 'jsonschema'

import { randomId } from '../../../src/random.mjs'
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
    "title" : { "type": "string" },
    "data" : { "type": "string" }
  },
  "required": ["title","data"]
}
const updateSchema = {
  "id": "update",
  "properties": {
    "title" : { "type": "string" },
    "data" : { "type": "string" },
    "folder" : { "type": "string" }
  }
}

// Get an item
export async function get(req, res) {
  const id = req.params.id

  // Search item
  const item = await prisma.items.findUnique({
    where: { id: id }
  });

  if ( item===null ) {
    res.status(404).send(R.ko("Item not found"))
    return
  }

  // Check read permissions on folder
  const perm = await Folder.permissions(item.folder, req.user);
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
}

/**
 * Get folder items
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function list(req, res) {
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
    const perm = await Folder.permissions(folder, req.user);
    if ( !perm.read ) {
      res.status(403).send(R.ko("Unauthorized"))
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
    contains.push( { title: { contains: token, mode: 'insensitive'} } )
  }

  // Search folder
  items = await prisma.items.findMany({
    where: {
      AND: [
        { folder: { in: folders.map(folders => folders) } },
        { AND: contains }
      ]
    },
    select: {
      id: true,
      folder: true,
      title: true,
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
}

/**
 * Create an item
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

  const folder = req.params.folder

  // Search folder
  if ( !await Folder.exists(folder) ) {
    res.status(404).send(R.ko("Folder not found"))
    return
  }

  // Check write permissions on folder
  const perm = await Folder.permissions(folder, req.user)
  if ( !perm.write ) {
    res.status(401).send(R.ko("Unauthorized"))
    return
  }

  // Encrypt data
  const encData = Crypt.encrypt(req.body.data)

  // Creates the item
  const newid = randomId();
  await prisma.items.create({
    data: {
      id: newid,
      folder: folder,
      title: req.body.title,
      data: encData.encrypted,
      dataiv: encData.iv,
      dataauthtag: encData.authTag
    }
  })

  actions.log(req.user, "create", "item", newid)
  res.status(201).send(R.ok({id: newid}));
}

/**
 * Updates an item
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function update(req, res) {
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
  });

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

  // If a folder is given through path or payload, check for existanace and permissions
  if ( folderFromURL ) {
    if ( !await Folder.exists(folderFromURL) ) {
      res.status(404).send(R.ko("Folder not found"))
      return
    }

    const perm2 = await Folder.permissions(folderFromURL, req.user);
    if ( !perm2.write ) {
      res.status(401).send(R.ko("Unauthorized"))
      return
    }

  }

  // Updates
  let updateStruct = {}
  if ( req.body.data ) {
    const encData = Crypt.encrypt(req.body.data)
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
  await prisma.items.update({
    data: updateStruct,
    where: {
      id: id
    }
  })

  actions.log(req.user, "update", "item", id)
  res.status(200).send(R.ok())
}

/**
 * Deletes an item
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function remove(req, res) {
  const id = req.params.id

  // Search item
  const item = await prisma.items.findUnique({
    where: { id: id }
  });

  if ( item===null ) {
    res.status(404).send(R.ko("Item not found"))
    return
  }

  // Search folder
  const folder = await prisma.folders.findUnique({
    where: { id: item.folder }
  });

  if ( folder===null ) {
    res.status(404).send(R.ko("Folder not found"))
    return
  }

  // Check write permissions on folder
  const perm = await Folder.permissions(item.folder, req.user);
  if ( !perm.write ) {
    res.status(401).send(R.ko("Unauthorized"))
    return
  }

  // Deletes folder
  await prisma.items.delete({
    where: {
      id: id
    }
  })

  actions.log(req.user, "delete", "item", id)
  res.status(200).send(R.ok('Done'))
}

