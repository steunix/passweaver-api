/**
 * Enterprise data controller module
 * @module controllers/edata
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as R from '../../../lib/response.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Item from '../../../model/item.mjs'
import * as Folder from '../../../model/folder.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import * as Const from '../../../lib/const.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'
import * as Metrics from '../../../lib/metrics.mjs'

import { isAdmin, isReadOnly } from '../../../lib/auth.mjs'

import DB from '../../../lib/db.mjs'

/**
 * Check if a personal secret has been set or used in a given session
 * @param {*} req Express request
 * @returns 0: OK, 412: Personal password not set, 417: Personal folder locked
 */
async function checkPersonalAccess (req) {
  // Validate personal key, if present
  if (req.personaltoken) {
    const valid = Auth.validatePersonalToken(req.personaltoken)
    return valid ? 0 : R.UNAUTHORIZED
  }

  const user = await DB.users.findUnique({
    where: { id: req.user },
    select: { personalsecret: true }
  })

  // User has not defined its personal secret yet
  if (user.personalsecret === null) {
    return R.PRECONDITION_FAILED
  }

  // User has set the password, but has not unlocked yet
  return R.EXPECTATION_FAILED
}

/**
 * Get item enterprise data
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function get (req, res, next) {
  const itemid = req.params.id

  // Check supplied key
  let key
  try {
    key = Buffer.from(req.query?.key, 'base64')
    if (key.length !== 32) {
      throw new Error('Invalid key length')
    }
  } catch (e) {
    res.status(R.BAD_REQUEST).send(R.badRequest('Invalid key'))
    return
  }

  // Only admins can access enterprise data
  if (!await isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Search item
  const itemedata = await DB.itemsedata.findUnique({
    where: { itemid }
  })
  if (itemedata === null) {
    res.status(R.NOT_FOUND).send(R.ko('Item not found'))
    return
  }

  // Decrypt content
  try {
    itemedata.data = await Item.decrypt(itemedata, req)
  } catch (e) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('This item is corrupted and cannot be decrypted'))
    return
  }

  // Reencrypt data with input token
  itemedata.data = Crypt.encryptedPayload(key, itemedata.data)

  // Removes unneeded info
  delete (itemedata.kmsid)
  delete (itemedata.dek)
  delete (itemedata.kekversion)
  delete (itemedata.dataauthtag)
  delete (itemedata.dataiv)
  delete (itemedata.algo)

  Metrics.counterInc(Const.METRICS_ITEMSEDATA_READ)

  res.send(R.ok(itemedata))
}

/**
 * Get enterprise data list
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function list (req, res, next) {
  // Only admins can access enterprise data
  if (!await isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  const userid = req.params?.userid

  let limit = parseInt(req.query?.limit) || 100
  if (limit > 100) {
    limit = 100
  }

  // Check supplied key
  let key
  try {
    key = Buffer.from(req.query?.key, 'base64')
    if (key.length !== 32) {
      throw new Error('Invalid key length')
    }
  } catch (e) {
    res.status(R.BAD_REQUEST).send(R.badRequest('Invalid key'))
    return
  }

  const where = {}
  if (userid) {
    where.userid = userid
  }

  // Search item enterprise data
  const itemedata = await DB.itemsedata.findUnique({
    where
  })

  if (itemedata === null) {
    res.status(R.NOT_FOUND).send(R.ko('Item not found'))
    return
  }

  const results = []
  for (const edata of itemedata) {
    // Decrypt content
    try {
      edata.data = await Item.decrypt(edata, req)
      // Reencrypt data with input token
      edata.data = Crypt.encryptedPayload(key, edata.data)
    } catch (e) {
      res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('This item is corrupted and cannot be decrypted'))
    }

    // Removes unneeded info
    delete (edata.kmsid)
    delete (edata.dek)
    delete (edata.kekversion)
    delete (edata.dataauthtag)
    delete (edata.dataiv)
    delete (edata.algo)
    results.push(edata)
  }

  Metrics.counterInc(Const.METRICS_ITEMSEDATA_LIST)

  res.send(R.ok(itemedata))
}

/**
 * Create an item enterprise data
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function create (req, res, next) {
  // Check if system is readonly
  if (await isReadOnly(req)) {
    res.status(R.CONFLICT).send(R.conflict())
    return
  }

  // Admins cannot create enterprise data
  if (await isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Validate payload
  if (!JV.validate(req.body, 'edata_create')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  const itemid = req.params.id
  const item = await DB.items.findUnique({
    where: { id: itemid },
    select: { folderid: true, enterprise: true }
  })
  if (item === null) {
    res.status(R.NOT_FOUND).send(R.ko('Item not found'))
    return
  }

  // Search folder
  if (!await Folder.exists(item.folderid)) {
    res.status(R.NOT_FOUND).send(R.ko('Folder not found'))
    return
  }

  // Check if personal
  if (await Folder.isPersonal(item.folderid)) {
    const check = await checkPersonalAccess(req)
    if (check !== 0) {
      res.status(check).send(R.ko('Personal folder not accessible'))
      return
    }
  } else {
    res.status(R.FORBIDDEN).send(R.ko('Enterprise data can only be associated to items in personal folders'))
    return
  }

  // Item must be enterprise
  if (!item.enterprise) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Enterprise data can only be associated to enterprise items'))
    return
  }

  // Encrypt data using KMS
  const encData = await Item.encrypt(req.body.data)

  await DB.$transaction(async (tx) => {
    await DB.itemsedata.deleteMany({
      where: {
        itemid
      }
    })

    // Creates the item enterprise data
    await DB.itemsedata.createMany({
      data: [{
        itemid,
        userid: req.user,
        kmsid: encData.kmsId,
        dek: encData.dek,
        kekversion: encData.kekversion,
        data: encData.encrypted,
        dataiv: encData.iv,
        dataauthtag: encData.authTag,
        algo: encData.algo
      }]
    })
  })

  await Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_ITEMEDATA, itemid)
  Metrics.counterInc(Const.METRICS_ITEMS_CREATED)
  res.status(R.CREATED).send(R.ok({ id: itemid }))
}
