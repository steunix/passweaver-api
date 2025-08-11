/**
 * API keys controller module
 * @module controllers/apikeys
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Const from '../../../lib/const.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import * as KMS from '../../../lib/kms/kms.mjs'
import * as User from '../../../model/user.mjs'
import * as APIKey from '../../../model/apikey.mjs'

import { isAdmin, isReadOnly } from '../../../lib/auth.mjs'
import DB from '../../../lib/db.mjs'

/**
 * Get API key
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Error callback
 * @returns
 */
export async function get (req, res, next) {
  const apiid = req.params.id

  // Must be admin
  if (!await isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Search API key
  const apik = await DB.apikeys.findUnique({
    where: { id: apiid },
    select: { id: true, description: true, userid: true, expiresat: true, active: true, createdat: true, updatedat: true, lastusedat: true, ipwhitelist: true, timewhitelist: true }
  })

  if (!apik) {
    res.status(R.NOT_FOUND).send(R.ko('API key not found'))
    return
  }

  apik.expiresat = apik.expiresat.toISOString().substring(0, 10)
  await Events.add(req.user, Const.EV_ACTION_READ, Const.EV_ENTITY_APIKEY, apiid)
  res.send(R.ok(apik))
}

/**
 * Get API keys list
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

  const apik = await DB.apikeys.findMany({
    where: {
      description: { contains: search, mode: 'insensitive' }
    },
    orderBy: {
      description: 'asc'
    }
  })

  if (apik.length === 0) {
    res.status(R.NOT_FOUND).send(R.ko('No API key found'))
    return
  }

  res.send(R.ok(apik))
}

/**
 * Create an API key
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
  if (!JV.validate(req.body, 'apikey_create')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // Check that user exists
  const userex = await User.exists(req.body.userid)
  if (!userex) {
    res.status(R.BAD_REQUEST).send(R.badRequest('User does not exist'))
    return
  }

  // Check IP whitelist format
  if (req.body.ipwhitelist && !APIKey.validateCIDRList(req.body.ipwhitelist)) {
    res.status(R.BAD_REQUEST).send(R.badRequest('Invalid IP whitelist format'))
    return
  }

  // Check time whitelist format
  if (req.body.timewhitelist && !APIKey.validateTimeWhitelist(req.body.timewhitelist)) {
    res.status(R.BAD_REQUEST).send(R.badRequest('Invalid time whitelist format'))
    return
  }

  // Creates the API key
  const secret = Crypt.randomString(20)
  const encsecret = await KMS.encrypt(secret, 'aes-256-gcm')

  const created = await DB.apikeys.create({
    data: {
      secret: encsecret.encrypted,
      secretiv: encsecret.iv,
      secretauthtag: encsecret.authTag,
      algorithm: encsecret.algo,
      kmsid: encsecret.kmsId,
      dek: encsecret.dek,
      kekversion: encsecret.kekversion,
      description: req.body.description,
      userid: req.body.userid,
      expiresat: req.body.expiresat + 'T00:00:00.000Z',
      active: req.body.active,
      ipwhitelist: req.body.ipwhitelist || null,
      timewhitelist: req.body.timewhitelist || null
    }
  })

  await Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_APIKEY, created.id)
  res.status(R.CREATED).send(R.ok({ id: created.id, secret }))
}

/**
 * Update an API key
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
  if (!JV.validate(req.body, 'apikey_update')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  const apikid = req.params.id

  // Search API key
  const apik = await DB.apikeys.findUnique({
    where: { id: apikid }
  })

  if (apik === null) {
    res.status(R.NOT_FOUND).send(R.ko('API key not found'))
    return
  }

  // Updates
  const updateStruct = {}
  if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
    updateStruct.description = req.body.description
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'userid')) {
    updateStruct.userid = req.body.userid
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'expiresat')) {
    updateStruct.expiresat = req.body.expiresat + 'T00:00:00.000Z'
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'active')) {
    updateStruct.active = req.body.active
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'ipwhitelist')) {
    // Validate IP whitelist
    if (!APIKey.validateCIDRList(req.body.ipwhitelist)) {
      res.status(R.BAD_REQUEST).send(R.badRequest('Invalid IP whitelist format'))
      return
    }

    updateStruct.ipwhitelist = req.body.ipwhitelist || null
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'timewhitelist')) {
    // Validate time whitelist
    if (!APIKey.validateTimeWhitelist(req.body.timewhitelist)) {
      res.status(R.BAD_REQUEST).send(R.badRequest('Invalid time whitelist format'))
      return
    }

    updateStruct.timewhitelist = req.body.timewhitelist || null
  }

  await DB.apikeys.update({
    data: updateStruct,
    where: {
      id: apikid
    }
  })

  await Events.add(req.user, Const.EV_ACTION_UPDATE, Const.EV_ENTITY_APIKEY, apikid)
  res.send(R.ok())
}

/**
 * Delete an API Key
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

  const apikid = req.params.id

  // Search API key
  const apik = await DB.apikeys.findUnique({
    where: { id: apikid }
  })

  if (apik === null) {
    res.status(R.NOT_FOUND).send(R.ko('API key not found'))
    return
  }

  // Deletes API key
  await DB.apikeys.delete({
    where: {
      id: apikid
    }
  })

  await Events.add(req.user, Const.EV_ACTION_DELETE, Const.EV_ENTITY_APIKEY, apikid)
  res.send(R.ok())
}
