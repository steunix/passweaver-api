/**
 * Util controller module
 * @module controllers/util
 * @author Stefano Rivoir <rs4000@gmail.com>
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
 * @param {function} next Next
 */
export async function generatePassword(req, res, next) {
  try {
    var pwd = generator.generate({
      length: 15,
      numbers: true,
      symbols: true,
      lowercase: true,
      uppercase: true,
      strict: true
    })

    res.status(200).send(R.ok({password: pwd}))
  } catch (err) {
    next(err)
  }
}

/**
 * Returns statistics about PassWeaver-API
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Next
 */
export async function info(req, res, next) {
  try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    const users = await DB.users.count()
    const items = await DB.items.count()
    const folders = await DB.folders.count()

    const version = Config.packageJson().version
    const cache = Cache.size()

    const data = {
      users: users,
      items: items,
      folders: folders,
      version: version,
      cacheSize: cache,
      startup: Config.get().startuptime
    }

    res.status(200).send(R.ok(data))
  } catch (err) {
    next(err)
  }
}