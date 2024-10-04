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
    symbols: true,
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

  Cache.resetFoldersTree()
  Cache.resetGroupsTree()

  res.send(R.ok())
}
