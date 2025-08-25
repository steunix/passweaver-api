/**
 * Personal folder controller module
 * @module controllers/personal
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import * as Const from '../../../lib/const.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'
import * as Config from '../../../lib/config.mjs'
import * as crypto from 'crypto'

import DB from '../../../lib/db.mjs'

/**
 * Unlock personal folder. A new JWT is sent containing the personal token.
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function unlock (req, res, next) {
  // Validate payload
  if (!JV.validate(req.body, 'personal')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // Check user
  const user = await DB.users.findUnique({
    where: { id: req.user },
    select: { personalsecret: true, personalseed: true }
  })
  if (user === null) {
    await Events.add(req.user, Const.EV_ACTION_UNLOCKNF, Const.EV_ENTITY_USER, req.user)
    res.status(R.UNAUTHORIZED).send(R.ko('Bad user or wrong password'))
    return
  }

  // Check password
  if (!await Crypt.checkPassword(req.body.password, user.personalsecret)) {
    await Events.add(req.user, Const.EV_ACTION_UNLOCKNV, Const.EV_ENTITY_USER, req.user)
    res.status(R.UNAUTHORIZED).send(R.ko('Wrong password'))
    return
  }

  // Create JWT token
  const token = await Auth.createToken(req.user, `${user.personalseed || ''}:${req.body.password}`)

  await Events.add(req.user, Const.EV_ACTION_UNLOCK, Const.EV_ENTITY_USER, req.user)
  res.send(R.ok({ jwt: token }))
}

/**
 * Set user personal password
 * @param {*} req Express request
 * @param {*} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function setPassword (req, res, next) {
  if (!JV.validate(req.body, 'personal')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // Check that personal password is not already set
  const user = await DB.users.findUnique({
    where: { id: req.user },
    select: { personalseed: true, personalsecret: true }
  })
  if (user.personalsecret !== null) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Personal password already set'))
    return
  }

  // Create personal storage key
  const pkey = Crypt.randomAESKey()

  // Create a random seed
  const seed = Crypt.randomBytes(16).toString('base64')

  // Derive a key from the personal password
  const dkey = crypto.pbkdf2Sync(req.body.password, seed, Config.get().crypto.personal_key_pbkdf2_iterations, 32, 'sha256')

  // Encrypt personal key with derived key
  const ckey = crypto.createCipheriv('aes-256-ecb', dkey, '')
  let ekey = ckey.update(pkey, '', 'base64')
  ekey += ckey.final('base64')

  dkey.fill(0)

  // Hash personal password for checking future personal items unlock
  const hpwd = await Crypt.hashPassword(req.body.password)

  await DB.users.update({
    where: { id: req.user },
    data: {
      personalsecret: hpwd,
      personalkey: ekey,
      personalseed: seed
    }
  })

  // Create new JWT token
  const token = await Auth.createToken(req.user, `${user.personalseed || ''}:${req.body.password}`)

  await Events.add(req.user, Const.EV_ACTION_PERSCREATE, Const.EV_ENTITY_USER, req.user)
  res.send(R.ok({ jwt: token }))
}

/**
 * Update personal password. The personal key is also reencrypted.
 * @param {*} req Express request
 * @param {*} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function updatePassword (req, res, next) {
  if (!JV.validate(req.body, 'personal')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }
  if (!req.jwt) {
    res.status(R.UNAUTHORIZED).send(R.unauthorized())
    return
  }

  // Get personal key and decrypt using the current JWT
  const user = await DB.users.findUnique({
    where: { id: req.user },
    select: { personalseed: true, personalkey: true }
  })
  const pkey = await Crypt.decryptPersonalKey(Buffer.from(user.personalkey, 'base64'), req.personaltoken)

  // Create a random seed
  const seed = Crypt.randomBytes(16).toString('base64')

  // Encrypt personal key with personal password
  const hash = crypto.pbkdf2Sync(req.body.password, seed, Config.get().crypto.personal_key_pbkdf2_iterations, 32, 'sha256')
  const cipher = crypto.createCipheriv('aes-256-ecb', hash, '')

  let ekey = cipher.update(pkey, '', 'base64')
  ekey += cipher.final('base64')

  hash.fill(0)

  // Personal password
  const pwd = await Crypt.hashPassword(req.body.password)

  await DB.users.update({
    where: { id: req.user },
    data: {
      personalsecret: pwd,
      personalkey: ekey,
      personalseed: seed
    }
  })

  // Create new JWT token
  const token = await Auth.createToken(req.user, `${user.personalseed || ''}:${req.body.password}`)

  await Events.add(req.user, Const.EV_ACTION_PERSCREATE, Const.EV_ENTITY_USER, req.user)
  res.send(R.ok({ jwt: token }))
}

/**
 * Reset personal password. All personal items become inaccessible.
 * @param {*} req Express request
 * @param {*} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function resetPassword (req, res, next) {
  if (!req.jwt) {
    res.status(R.UNAUTHORIZED).send(R.unauthorized())
    return
  }

  await DB.users.update({
    where: { id: req.user },
    data: {
      personalsecret: null,
      personalkey: null,
      personalseed: null
    }
  })

  await Events.add(req.user, Const.EV_ACTION_PERSRESET, Const.EV_ENTITY_USER, req.user)

  // Create new JWT token
  const token = await Auth.createToken(req.user)
  res.send(R.ok({ jwt: token }))
}
