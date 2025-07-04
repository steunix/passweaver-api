/**
 * KMS controller module
 * @module controllers/kms
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Const from '../../../lib/const.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'

import { isAdmin, isReadOnly } from '../../../lib/auth.mjs'
import DB from '../../../lib/db.mjs'

/**
 * Get KMS
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

  // Search KMS
  const kms = await DB.kms.findUnique({
    where: { id: typeid }
  })

  if (!kms) {
    res.status(R.NOT_FOUND).send(R.ko('KMS not found'))
    return
  }

  Events.add(req.user, Const.EV_ACTION_READ, Const.EV_ENTITY_KMS, typeid)
  res.send(R.ok(kms))
}

/**
 * Get KMS list
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function list (req, res, next) {
  // Must be admin
  if (!await isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  const search = req.query?.search ?? ''

  const kms = await DB.kms.findMany({
    where: {
      description: { contains: search, mode: 'insensitive' }
    },
    orderBy: {
      description: 'asc'
    }
  })

  if (kms.length === 0) {
    res.status(R.NOT_FOUND).send(R.ko('No KMS found'))
    return
  }

  res.send(R.ok(kms))
}

/**
 * Create a KMS
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
  if (!JV.validate(req.body, 'kms_create')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // Check that config is a valid JSON
  try {
    JSON.parse(req.body.config)
  } catch (err) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // Creates the KMS
  const created = await DB.kms.create({
    data: {
      description: req.body.description,
      type: req.body.type,
      config: req.body.config,
      active: req.body.active
    }
  })

  // If active, set false all other KMS
  if (req.body.active === true) {
    await DB.kms.updateMany({
      where: {
        id: { not: created.id }
      },
      data: {
        active: false
      }
    })
  }

  Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_KMS, created.id)
  res.status(R.CREATED).send(R.ok({ id: created.id }))
}

/**
 * Update a KMS
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
  if (!JV.validate(req.body, 'kms_update')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  const kmsid = req.params.id

  // Search KMS
  const kms = await DB.kms.findUnique({
    where: { id: kmsid }
  })

  if (kms === null) {
    res.status(R.NOT_FOUND).send(R.ko('KMS not found'))
    return
  }

  // Updates
  const updateStruct = {}
  if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
    updateStruct.description = req.body.description
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'type')) {
    updateStruct.type = req.body.type
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'config')) {
    updateStruct.config = req.body.config
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'active')) {
    updateStruct.active = req.body.active
  }

  await DB.kms.update({
    data: updateStruct,
    where: {
      id: kmsid
    }
  })

  // If active, set false all other KMS
  if (updateStruct.active === true) {
    await DB.kms.updateMany({
      where: {
        id: { not: kmsid }
      },
      data: {
        active: false
      }
    })
  }

  Events.add(req.user, Const.EV_ACTION_UPDATE, Const.EV_ENTITY_KMS, kmsid)
  res.send(R.ok())
}

/**
 * Delete a KMS
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

  const kmsid = req.params.id

  // Search KMS
  const kms = await DB.kms.findUnique({
    where: { id: kmsid }
  })

  if (kms === null) {
    res.status(R.NOT_FOUND).send(R.ko('KMS not found'))
    return
  }

  // Explicitly check that KMS is not used
  const itms = await DB.items.findFirst({
    where: {
      kmsid
    }
  })
  if (itms !== null) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('KMS is used, it cannot be deleted'))
    return
  }

  // Deletes KMS
  await DB.kms.delete({
    where: {
      id: kmsid
    }
  })

  Events.add(req.user, Const.EV_ACTION_DELETE, Const.EV_ENTITY_KMS, kmsid)
  res.send(R.ok())
}
