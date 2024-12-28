/**
 * One type tokens module
 * @module controllers/onetimetokens
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as R from '../../../lib/response.mjs'
import DB from '../../../lib/db.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import * as Config from '../../../lib/config.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Const from '../../../lib/const.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'
import * as Items from '../../../model/item.mjs'

/**
 * Decrypt and return a one time secret
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Error callback
 * @returns
 */
export async function get (req, res, next) {
  const tokenid = req.params.id

  // Search token
  const ottoken = await DB.onetimetokens.findUnique({
    where: { token: tokenid }
  })

  if (ottoken === null) {
    res.status(R.NOT_FOUND).send(R.ko('Token not found'))
    return
  }

  // Check scope
  // TODO: check scope

  const resp = {
    secret: '',
    item: {},
    type: ottoken.type
  }

  // Generic secret
  if (ottoken.type === 0) {
    resp.secret = Crypt.decrypt(ottoken.data, ottoken.dataiv, ottoken.dataauthtag)
  }
  // Item share
  if (ottoken.type === 1) {
    // Get item relevant fields
    resp.item = await DB.items.findUnique({
      where: { id: ottoken.itemid },
      select: { id: true, type: true, title: true }
    })
    if (resp.item === null) {
      res.status(R.NOT_FOUND).send(R.ko('Item not found'))
      return
    }
    resp.item.data = await Items.decrypt(ottoken.itemid, req)
  }

  // Delete token
  await DB.onetimetokens.deleteMany({
    where: { token: tokenid }
  })

  if (ottoken.type === 0) {
    Events.add(req.user, Const.EV_ACTION_READ, Const.EV_ENTITY_ONETIMESECRET, ottoken.id)
  }
  if (ottoken.type === 1) {
    Events.add(req.user, Const.EV_ACTION_READ, Const.EV_ENTITY_ONETIMESHARE, ottoken.id)
    Events.add(req.user, Const.EV_ACTION_READVIATOKEN, Const.EV_ENTITY_ITEM, ottoken.itemid)
  }
  res.send(R.ok(resp))
}

/**
 * Create a one time token
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function create (req, res, next) {
  // Validate payload
  if (!JV.validate(req.body, 'onetimesecret_create')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // Check data is not empty
  if (req.body.type === 0 && (req.body?.data === '' || req.body?.data === undefined)) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Data cannot be empty for type 0'))
    return
  }

  // Check for item id
  if (req.body.type === 1 && (req.body?.itemid === '' || req.body?.itemid === undefined)) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Item id cannot be empty for type 1'))
    return
  }

  // Check for user id
  if (req.body.scope === 2 && req.body.userid === '') {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('User id cannot be empty for scope 2'))
    return
  }

  // Check if expiration is within limits
  if (parseInt(req.body.hours) > parseInt(Config.get().onetimetokens.max_hours)) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Hours exceed server limit'))
    return
  }

  // Delete expired items
  await DB.onetimetokens.deleteMany({
    where: {
      expiresat: {
        lte: new Date()
      }
    }
  })

  // Creates the item type
  const newToken = Crypt.randomString(20)
  const newdata = {
    token: newToken,
    type: req.body.type,
    scope: req.body.scope,
    expiresat: new Date(Date.now() + req.body.hours * (60 * 60 * 1000)),
    userid: req.body?.userid,
    itemid: req.body?.itemid
  }

  if (req.body.type === 0) {
    const encData = Crypt.encrypt(req.body.data)
    newdata.data = encData.encrypted
    newdata.dataiv = encData.iv
    newdata.dataauthtag = encData.authTag
  }

  const created = await DB.onetimetokens.create({
    data: newdata
  })

  if (req.body.type === 0) {
    Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_ONETIMESECRET, created.id)
  }
  if (req.body.type === 1) {
    Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_ONETIMESHARE, created.id)
    Events.add(req.user, Const.EV_ACTION_ITEMSHARE, Const.EV_ENTITY_ITEM, req.body.itemid)
  }
  res.status(R.CREATED).send(R.ok({ token: newToken }))
}
