/**
 * Login controller module
 * @module controllers/login
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaClient } from '@prisma/client'
import jsonschema from 'jsonschema'

import * as R from '../../../src/response.mjs'
import * as actions from '../../../src/action.mjs'
import * as Auth from '../../../src/auth.mjs'
import * as Config from '../../../src/config.mjs'
import * as Crypt from '../../../src/crypt.mjs'

const prisma = new PrismaClient(Config.get().prisma_options)

const schemaLogin = {
  "id": "/login",
  "type": "object",
  "properties": {
    "username" : { "type": "string" },
    "password" : { "type": "string" }
  },
  "required": ["username", "password"]
}

const schemaPersonal = {
  "id": "/login",
  "type": "object",
  "properties": {
    "password" : { "type": "string" }
  },
  "required": ["password"]
}

/**
 * Login
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function login(req, res, next) {
  try {
    // Validate payload
    const validate = jsonschema.validate(req.body, schemaLogin)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    // Check user
    const user = await prisma.users.findFirst({
      where: { login: req.body.username }
    })
    if ( user===null ) {
      actions.log(req.body.username, "loginnotfound", "user", req.body.username)
      res.status(401).send(R.ko("Bad user or wrong password"))
      return
    }

    // Check password
    if ( !await( Crypt.checkPassword(req.body.password, user.secret) ) ) {
      actions.log(null, "loginfail", "user", req.body.username)
      res.status(401).send(R.ko("Bad user or wrong password"))
      return
    }

    // Creates JWT token
    const token = await Auth.createToken(user.id, false)

    actions.log(user.id,"login", "user", user.id)
    res.status(200).send(R.ok({jwt:token}))
  } catch(err) {
    next(err)
  }
}

/**
 * Personal folder login
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function personalFolderLogin(req, res, next) {
  try {
    // Validate payload
    const validate = jsonschema.validate(req.body, schemaPersonal)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    // Check user
    const user = await prisma.users.findFirst({
      where: { login: req.user }
    })
    if ( user===null ) {
      actions.log(req.body.username, "personalloginnotfound", "user", req.body.username)
      res.status(401).send(R.ko("Bad user or wrong password"))
      return
    }

    // Check password
    if ( !await( Crypt.checkPassword(req.body.password, user.personalSecret) ) ) {
      actions.log(null, "personalloginfail", "user", req.body.username)
      res.status(401).send(R.ko("Wrong password"))
      return
    }

    // Creates JWT token
    const token = await Auth.createToken(user.id, true)

    actions.log(user.id,"personallogin", "user", user.id)
    res.status(200).send(R.ok({jwt:token}))
  } catch(err) {
    next(err)
  }
}
