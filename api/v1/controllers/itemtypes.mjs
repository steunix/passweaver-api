/**
 * Item types controller module
 * @module controllers/itemtypes
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonschema from 'jsonschema'

import { newId } from '../../../lib/id.mjs'
import * as R from '../../../lib/response.mjs'
import * as actions from '../../../lib/action.mjs'
import { isAdmin } from '../../../lib/auth.mjs'
import DB from '../../../lib/db.mjs'

// Payload schema
const createSchema = {
  "id": "create",
  "properties": {
    "description" : { "type": "string", "maxLength": 20},
    "icon" : { "type": "string", "maxLength": 50}
  },
  "required": ["description"]
}
const updateSchema = {
  "id": "update",
  "properties": {
    "description" : { "type": "string", "maxLength": 20},
    "icon" : { "type": "string", "maxLength": 50}
  },
  "required": ["description"]
}

/**
 *
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Error callback
 * @returns
 */
export async function get(req, res, next) {
  try {
    const id = req.params.id

    // Must be admin
    if ( !await isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    // Search item
    const itemtype = await DB.itemtypes.findUnique({
      where: { id: id }
    })

    if ( itemtype===null ) {
      res.status(404).send(R.ko("Item type not found"))
      return
    }

    actions.log(req.user, "read", "itemtype", id)
    res.status(200).send(R.ok(itemtype))
  } catch (err) {
    next(err)
  }
}

/**
 * Get items types list
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function list(req, res, next) {
  try {
    const search = req.query?.search ?? ''

    const itemtypes = await DB.itemtypes.findMany({
      where: {
        description: { contains: search, mode: 'insensitive' }
      },
      orderBy: {
        description: "asc"
      }
    })

    if ( itemtypes.length==0 ) {
      res.status(404).send(R.ko("No item found"))
      return
    }

    res.status(200).send(R.ok(itemtypes))
  } catch (err) {
    next(err)
  }
}

/**
 * Create an item type
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function create(req, res, next) {
  try {
    // Must be admin
    if ( !await isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    // Validate payload
    const validate = jsonschema.validate(req.body, createSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    // Creates the item type
    const newid = newId()
    await DB.itemtypes.create({
      data: {
        id: newid,
        description: req.body.description,
        icon: req.body?.icon
      }
    })

    actions.log(req.user, "create", "itemtype", newid)
    res.status(201).send(R.ok({id: newid}))
  } catch (err) {
    next(err)
  }
}

/**
 * Update an item type
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function update(req, res, next) {
  try {
    // Must be admin
    if ( !await isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    // Validate payload
    const validate = jsonschema.validate(req.body, updateSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    const id = req.params.id

    // Search item
    const itemtypes = await DB.itemtypes.findUnique({
      where: { id: id }
    })

    if ( itemtypes===null ) {
      res.status(404).send(R.ko("Item type not found"))
      return
    }

    // Updates
    let updateStruct = {}
    if ( req.body.description ) {
      updateStruct.description = req.body.description
    }
    if ( req.body.icon ) {
      updateStruct.icon = req.body.icon
    }
    await DB.itemtypes.update({
      data: updateStruct,
      where: {
        id: id
      }
    })

    actions.log(req.user, "update", "itemtype", id)
    res.status(200).send(R.ok())
  } catch (err) {
    next(err)
  }
}

/**
 * Delete an item type
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function remove(req, res, next) {
  try {
    // Must be admin
    if ( !await isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    const id = req.params.id

    // Search items type
    const itemtypes = await DB.itemtypes.findUnique({
      where: { id: id }
    })

    if ( itemtypes===null ) {
      res.status(404).send(R.ko("Item type not found"))
      return
    }

    await DB.$transaction(async(tx)=>{
      // Clear fields for existing items
      await DB.items.updateMany({
        data: { type: null},
        where: {
          type: id
        }
      })

      // Deletes item
      await DB.itemtypes.delete({
        where: {
          id: id
        }
      })
    })

    actions.log(req.user, "delete", "itemtype", id)
    res.status(200).send(R.ok('Done'))
  } catch (err) {
    next(err)
  }
}
