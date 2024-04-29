/**
 * Authorization module
 * @module lib/auth
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonwebtoken from 'jsonwebtoken'

import * as R from './response.mjs'
import * as Config from './config.mjs'
import * as Const from './const.mjs'
import DB from './db.mjs'

/**
 * Creates a JWT token
 * @param {string} user User ID
 * @param {boolean} personalfolderunlocked Grant access to personal folder
 * @returns {string} A JWT
 */
export async function createToken(user, personalfolderunlocked) {
  const isadmin = await isAdmin(user)

  return jsonwebtoken.sign(
    { user: user, admin: isadmin, personalfolderunlocked: personalfolderunlocked },
    Config.get().jwt_key, {
      algorithm: "HS512",
      expiresIn: Config.get().jwt_duration
    }
  )
}

/**
 * JWT validation middleware
 * @param {Object} req Request
 * @param {Object} res Response
 * @param {Function} next Next action
 * @returns {boolean} True if JWT is valid
 */
export function validateJWT(req, res, next) {
  let token
  try {
    token = req.headers["authorization"].split(" ")[1]
  } catch ( exc ) {
    return res.status(401).send(R.ko("A token is required for authentication"))
  }
  try {
    const decoded = jsonwebtoken.verify(token, Config.get().jwt_key)
    req.jwt = decoded
    req.user = decoded.user
    req.personalfolderunlocked = decoded.personalfolderunlocked
  } catch (err) {
    var msg = "Invalid token"
    if ( err.name=='TokenExpiredError' ) {
      msg = "Token expired"
    }
    return res.status(401).send(R.ko(msg))
  }
  return next()
}

/**
 * Check if current user is an admin
 * @param {any} entity User (string) or request (object)
 * @returns {boolean} Whether current request user has admin privileges or not
 */
export async function isAdmin(entity) {
  if ( typeof(entity)==="string" ) {
    const perm = await DB.usersGroups.findMany({
      where: {
        group: Const.PW_GROUP_ADMINSID,
        user: entity
      }
    })
    return perm.length>0
  } else {
    return entity.jwt.admin
  }
}