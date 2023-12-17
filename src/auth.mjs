/**
 * Authorization module
 * @module src/auth
 */

import { PrismaClient } from '@prisma/client'

import * as R from '../src/response.mjs'
import jsonwebtoken from 'jsonwebtoken'
import * as Config from '../src/config.mjs'
import * as crypto from 'crypto'

const prisma = new PrismaClient(Config.get().prisma_options)

/**
 * Creates a JWT token
 * @param {string} user
 * @param {string} userlogin
 * @returns {string} A JWT
 */
export function createToken(user, userlogin) {
  return jsonwebtoken.sign(
    { user: user, userlogin: userlogin },
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
 * @returns {boolean} Wehter current request user has admin privileges or not
 */
export async function isAdmin(req) {
  const perm = await prisma.usersGroups.findMany({
    where: {
      group: "0",
      user: req.user
    }
  })

  return perm.length>0
}