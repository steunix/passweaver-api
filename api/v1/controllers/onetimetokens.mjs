/**
 * One type tokens module
 * @module controllers/onetimetokens
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import * as R from '../../../lib/response.mjs'
import DB from '../../../lib/db.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import * as Config from '../../../lib/config.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Const from '../../../lib/const.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'

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

  const data = Crypt.decrypt(ottoken.data, ottoken.dataiv, ottoken.dataauthtag)

  // Delete token
  await DB.onetimetokens.deleteMany({
    where: { token: tokenid }
  })

  Events.add(req.user, Const.EV_ACTION_READ, Const.EV_ENTITY_ONETIMESECRET, ottoken.id)
  res.send(R.ok(data))
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
  if (req.body.data === '') {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Data cannot be empty'))
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
  const encData = Crypt.encrypt(req.body.data)
  const exp = new Date(Date.now() + req.body.hours * (60 * 60 * 1000))

  const created = await DB.onetimetokens.create({
    data: {
      token: newToken,
      expiresat: exp,
      data: encData.encrypted,
      dataiv: encData.iv,
      dataauthtag: encData.authTag
    }
  })

  Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_ONETIMESECRET, created.id)
  res.status(R.CREATED).send(R.ok({ token: newToken }))
}
