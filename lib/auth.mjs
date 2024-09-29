/**
 * Authorization module
 * @module lib/auth
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import jsonwebtoken from 'jsonwebtoken'
import * as crypto from 'crypto'

import * as R from './response.mjs'
import * as Config from './config.mjs'
import * as Const from './const.mjs'
import DB from './db.mjs'

/**
 * Creates a JWT token. If personalPassword is specified, it gets encrypted with the key
 * generated at startup (see config.mjs) and added to the claim
 * @param {string} user User ID
 * @param {string} personalPassword User's personal password
 * @returns {string} Authentication JWT
 */
export async function createToken (user, personalPassword) {
  const isadmin = await isAdmin(user)

  const data = {
    sub: user,
    iss: 'Passweaver API',
    admin: isadmin
  }

  if (personalPassword) {
    data.personaltoken = createPersonalToken(personalPassword)
  }

  return jsonwebtoken.sign(
    data,
    Config.get().jwt_key, {
      algorithm: 'HS512',
      expiresIn: Config.get().jwt_duration
    }
  )
}

/**
 * JWT validation middleware. Adds user, jwt and personaltoken to Express request object.
 * @param {Object} req Request
 * @param {Object} res Response
 * @param {Function} next Next action
 * @returns {boolean} True if JWT is valid
 */
export function validateJWT (req, res, next) {
  let token
  try {
    token = req.headers.authorization.split(' ')[1]
  } catch (exc) {
    return res.status(R.UNAUTHORIZED).send(R.ko('A token is required for authentication'))
  }
  try {
    const decoded = jsonwebtoken.verify(token, Config.get().jwt_key)
    req.jwt = decoded
    req.user = decoded.sub
    if (decoded.personaltoken) {
      req.personaltoken = decoded.personaltoken
    }
  } catch (err) {
    let msg = 'Invalid token'
    if (err.name === 'TokenExpiredError') {
      msg = 'Token expired'
    }
    return res.status(R.UNAUTHORIZED).send(R.ko(msg))
  }
  return next()
}

/**
 * Check if user (or current request user) is an admin (member of Admins group)
 * @param {any} entity User (string) or request (object)
 * @returns {boolean} Whether current request user has admin privileges or not
 */
export async function isAdmin (entity) {
  if (typeof (entity) === 'string') {
    const perm = await DB.groupsmembers.findMany({
      where: {
        groupid: Const.PW_GROUP_ADMINSID,
        userid: entity
      },
      select: { id: true }
    })
    return perm.length > 0
  } else {
    return entity.jwt.admin
  }
}

/**
 * Create a personal key to be sent to the client when personal folder is unlocked.
 * The password is seeded before encryption.
 * @param {string} password Password to be encrypted
 * @returns {string} The personal key
 */
export function createPersonalToken (password) {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Config.get().personal_key,
    Config.get().personal_iv
  )

  let encrypted = cipher.update(Config.get().personal_seed + password, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  return encrypted
}

/**
 * Validates a personal token: it is decrypted and checked against the seed
 * @param {string} personaltoken Personal key to validate
 */
export function validatePersonalToken (personaltoken) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Config.get().personal_key,
    Config.get().personal_iv
  )

  let decrypted = decipher.update(personaltoken, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  const seed = decrypted.substring(0, Config.get().personal_seed.length)
  return seed === Config.get().personal_seed
}
