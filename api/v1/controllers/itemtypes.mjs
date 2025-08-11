/**
 * Item types controller module
 * @module controllers/itemtypes
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Const from '../../../lib/const.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'
import * as Cache from '../../../lib/cache.mjs'

import { isAdmin, isReadOnly } from '../../../lib/auth.mjs'
import DB from '../../../lib/db.mjs'

/**
 * Get item type
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Error callback
 * @returns
 */
export async function get (req, res, next) {
  const typeid = req.params.id

  // Must be admin
  if (!await isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  const cache = await Cache.get('all', Cache.itemTypesKey)
  let itemtype
  if (!cache) {
    // Search item
    itemtype = await DB.itemtypes.findUnique({
      where: { id: typeid }
    })
  } else {
    itemtype = cache.find(itm => {
      return itm.id === typeid
    })
  }

  if (!itemtype) {
    res.status(R.NOT_FOUND).send(R.ko('Item type not found'))
    return
  }

  await Events.add(req.user, Const.EV_ACTION_READ, Const.EV_ENTITY_ITEMTYPE, typeid)
  res.send(R.ok(itemtype))
}

/**
 * Get items types list
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function list (req, res, next) {
  const search = req.query?.search ?? ''

  const cache = await Cache.get('all', Cache.itemTypesKey)
  let itemtypes

  if (!cache) {
    itemtypes = await DB.itemtypes.findMany({
      where: {
        description: { contains: search, mode: 'insensitive' }
      },
      orderBy: {
        description: 'asc'
      }
    })
    await Cache.set('all', Cache.itemTypesKey, itemtypes)
  } else {
    itemtypes = cache
  }

  if (itemtypes.length === 0) {
    res.status(R.NOT_FOUND).send(R.ko('No item found'))
    return
  }

  res.send(R.ok(itemtypes))
}

/**
 * Create an item type
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function create (req, res, next) {
  // Check if system is readonly
  if (await isReadOnly(req)) {
    res.status(R.CONFLICT).send(R.conflict())
    return
  }

  // Must be admin
  if (!await isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Validate payload
  if (!JV.validate(req.body, 'itemtype_create')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // Creates the item type
  const created = await DB.itemtypes.create({
    data: {
      description: req.body.description,
      icon: req.body?.icon
    }
  })

  await Cache.resetItemTypes()
  await Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_ITEMTYPE, created.id)
  res.status(R.CREATED).send(R.ok({ id: created.id }))
}

/**
 * Update an item type
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function update (req, res, next) {
  // Check if system is readonly
  if (await isReadOnly(req)) {
    res.status(R.CONFLICT).send(R.conflict())
    return
  }

  // Must be admin
  if (!await isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Validate payload
  if (!JV.validate(req.body, 'itemtype_update')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  const typeid = req.params.id

  // Search item
  const itemtypes = await DB.itemtypes.findUnique({
    where: { id: typeid }
  })

  if (itemtypes === null) {
    res.status(R.NOT_FOUND).send(R.ko('Item type not found'))
    return
  }

  // Updates
  const updateStruct = {}
  if (req.body.description) {
    updateStruct.description = req.body.description
  }
  if (req.body.icon) {
    updateStruct.icon = req.body.icon
  }
  await DB.itemtypes.update({
    data: updateStruct,
    where: {
      id: typeid
    }
  })

  await Cache.resetItemTypes()
  await Events.add(req.user, Const.EV_ACTION_UPDATE, Const.EV_ENTITY_ITEMTYPE, typeid)
  res.send(R.ok())
}

/**
 * Delete an item type
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function remove (req, res, next) {
  // Check if system is readonly
  if (await isReadOnly(req)) {
    res.status(R.CONFLICT).send(R.conflict())
    return
  }

  // Must be admin
  if (!await isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  const typeid = req.params.id

  // Search items type
  const itemtypes = await DB.itemtypes.findUnique({
    where: { id: typeid }
  })

  if (itemtypes === null) {
    res.status(R.NOT_FOUND).send(R.ko('Item type not found'))
    return
  }

  await DB.$transaction(async (tx) => {
    // Clear fields for existing items
    await DB.items.updateMany({
      data: { type: null },
      where: {
        type: typeid
      }
    })

    // Deletes item
    await DB.itemtypes.delete({
      where: {
        id: typeid
      }
    })
  })

  await Cache.resetItemTypes()
  await Events.add(req.user, Const.EV_ACTION_DELETE, Const.EV_ENTITY_ITEMTYPE, typeid)
  res.send(R.ok())
}
