/**
 * Authorization module
 * @module src/auth
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaClient } from '@prisma/client'

import * as R from '../src/response.mjs'
import jsonwebtoken from 'jsonwebtoken'
import * as Config from '../src/config.mjs'

const prisma = new PrismaClient(Config.get().prisma_options)

/**
 * Creates a JWT token
 * @param {string} user
 * @returns {string} A JWT
 */
export async function createToken(user) {
  const isadmin = await isAdmin(user)

  return jsonwebtoken.sign(
    { user: user, admin: isadmin  },
    Config.get().jwt_key, {
      algorithm: "HS512",
      expiresIn: "24h"
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
  } catch (err) {
    return res.status(401).send(R.ko("Invalid Token"))
  }
  return next()
}

/**
 * Check if current user is an admin
 * @param {Object} req
 * @returns {boolean} Whether current request user has admin privileges or not
 */
export async function isAdmin(req) {
  const perm = await prisma.usersGroups.findMany({
    where: {
      group: "A",
      user: typeof(req)==="string" ? req : req.user
    }
  })

  return perm.length>0
}