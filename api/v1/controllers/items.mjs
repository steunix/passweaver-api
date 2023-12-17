/**
 * Items controller module
 * @module controllers/items
 */

import { PrismaClient } from '@prisma/client'
import jsonschema from 'jsonschema'

import { randomId } from '../../../src/random.mjs'
import * as R from '../../../src/response.mjs'
import * as actions from '../../../src/action.mjs'
import * as Config from '../../../src/config.mjs'
import * as Folder from '../../../model/folder.mjs'
import * as Auth from '../../../src/auth.mjs'
import * as Crypt from '../../../src/crypt.mjs'

const prisma = new PrismaClient(Config.get().prisma_options)

// Payload schema
const createSchema = {
  "id": "create",
  "type": "object",
  "properties": {
    "title" : { "type": "string" },
    "description" : { "type": "string" },
    "data" : { "type": "object" }
  },
  "required": ["title","description","data"]
}

// Get an item
export async function get(req, res) {
  const id = req.params.id

  // Search item
  const item = await prisma.Items.findUnique({
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
  item.description = Auth.decrypt(item.description, item.descriptioniv, item.descriptionauthtag)
  item.data = JSON.parse(Auth.decrypt(item.data, item.dataiv, item.dataauthtag))

  // Removes unneeded info
  delete(item.descriptionauthtag)
  delete(item.descriptioniv)
  delete(item.dataauthtag)
  delete(item.dataiv)

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
  const folder = req.params.folder
  const id = req.params.id

  // Search folder
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

  // Search folder
  const items = await prisma.items.findMany({
    where: { folder: folder },
    select: {
      id: true,
      folder: true,
      title: true,
      createdat: true,
      updatedat: true
    }
  });

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
  const encDescription = Crypt.encrypt(req.body.description)
  const encData = Crypt.encrypt(JSON.stringify(req.body.data))

  // Creates the item
  const newid = randomId();
  await prisma.items.create({
    data: {
      id: newid,
      folder: folder,
      title: req.body.title,
      description: encDescription.encrypted,
      descriptioniv: encDescription.iv,
      descriptionauthtag: encDescription.authTag,
      data: encData.encrypted,
      dataiv: encData.iv,
      dataauthtag: encData.authTag
    }
  })

  actions.log(req.user, "create", "item", newid)
  res.status(200).send(R.ok({id: newid}));
}

/**
 * Updates an item
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function update(req, res) {
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
    where: { id: req.body.folder }
  });

  if ( folder===null ) {
    res.status(404).send(R.ko("Folder not found"))
    return
  }

  // Check write permissions on folder
  const perm = await Folder.permissions(req.body.folder, req.user);
  if ( !perm.write ) {
    res.status(401).send(R.ko("Unauthorized"))
    return
  }

  // Updates
  await prisma.items.update({
    data: {
      folder: req.body.folder,
      title: req.body.title,
      description: req.body.description,
      data: JSON.stringify(req.body.data)
    },
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

  await actions.log(req.user, "delete", "item", id)
  res.status(200).send(R.ok('Done'))
}

