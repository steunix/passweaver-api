/**
 * Util controller module
 * @module controllers/util
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import generator from 'generate-password'

import * as R from '../../../lib/response.mjs'
import * as Config from '../../../lib/config.mjs'
import * as Cache from '../../../lib/cache.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Settings from '../../../lib/settings.mjs'
import * as Const from '../../../lib/const.mjs'

import DB from '../../../lib/db.mjs'

/**
 * Generate a password
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function generatePassword (req, res, next) {
  const pwd = generator.generate({
    length: 15,
    numbers: true,
    symbols: req?.query?.symbols !== 'false',
    lowercase: true,
    uppercase: true,
    strict: true
  })

  res.send(R.ok({ password: pwd }))
}

/**
 * Return statistics about PassWeaver-API
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 */
export async function info (req, res, next) {
  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  const users = await DB.users.count()
  const items = await DB.items.count()
  const folders = await DB.folders.count()

  const version = Config.packageJson().version
  const cache = await Cache.size()

  const data = {
    users,
    items,
    folders,
    version,
    cacheProvider: Config.get().redis.enabled ? 'redis' : 'node-cache',
    cacheSize: cache,
    startup: Config.get().startuptime
  }

  res.send(R.ok(data))
}

/**
 * Clear the entire cache
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Object} next Express next
 */
export async function clearCache (req, res, next) {
  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  await Cache.resetFoldersTree()
  await Cache.resetGroupsTree()
  await Cache.resetItemTypes()

  res.send(R.ok())
}

/**
 * Lock the system
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Object} next Express next
 */
export async function systemLock (req, res, next) {
  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  await Settings.set(Const.PW_USER_ADMINID, 'systemlock', '1')
  Config.generateJWTKey()

  res.send(R.ok())
}

/**
 * Unlock the system
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Object} next Express next
 */
export async function systemUnlock (req, res, next) {
  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  await Settings.set(Const.PW_USER_ADMINID, 'systemlock', '0')

  res.send(R.ok())
}

/**
 * Set the system in readonly mode
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Object} next Express next
 */
export async function systemReadOnly (req, res, next) {
  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  await Cache.set(Const.PW_USER_ADMINID, 'readonly', true)

  res.send(R.ok())
}

/**
 * Set the system in readwrite mode
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Object} next Express next
 */
export async function systemReadWrite (req, res, next) {
  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  await Cache.set(Const.PW_USER_ADMINID, 'readonly', false)

  res.send(R.ok())
}

/**
 * Return the system readonly status
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Object} next Express next
 */
export async function systemGetReadOnly (req, res, next) {
  const readonly = await Cache.get(Const.PW_USER_ADMINID, 'readonly')
  res.send(R.ok({ readonly }))
}
