/**
 * Util controller module
 * @module controllers/util
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaClient } from '@prisma/client'
import generator from 'generate-password'

import * as R from '../../../lib/response.mjs'
import * as Config from '../../../lib/config.mjs'
import * as Cache from '../../../lib/cache.mjs'
import * as Auth from '../../../lib/auth.mjs'

const prisma = new PrismaClient(Config.get().prisma_options)

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
export async function stats(req, res, next) {
  try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    const users = await prisma.users.count()
    const items = await prisma.items.count()
    const folders = await prisma.folders.count()

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