/**
 * Item types controller module
 * @module controllers/itemtypes
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonschema from 'jsonschema'

import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Const from '../../../lib/const.mjs'
import { isAdmin } from '../../../lib/auth.mjs'
import DB from '../../../lib/db.mjs'

// Payload schemas
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
 * Get item type
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
      res.status(403).send(R.forbidden())
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

    Events.add(req.user, Const.EV_ACTION_READ, Const.EV_ENTITY_ITEMTYPE, id)
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
      res.status(403).send(R.forbidden())
      return
    }

    // Validate payload
    const validate = jsonschema.validate(req.body, createSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.badRequest())
      return
    }

    // Creates the item type
    const created = await DB.itemtypes.create({
      data: {
        description: req.body.description,
        icon: req.body?.icon
      }
    })

    Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_ITEMTYPE, created.id)
    res.status(201).send(R.ok({id: created.id}))
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

    Events.add(req.user, Const.EV_ACTION_UPDATE, Const.EV_ENTITY_ITEMTYPE, id)
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
      res.status(403).send(R.forbidden())
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
        data: { type: null },
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

    Events.add(req.user, Const.EV_ACTION_DELETE, Const.EV_ENTITY_ITEMTYPE, id)
    res.status(200).send(R.ok('Done'))
  } catch (err) {
    next(err)
  }
}
