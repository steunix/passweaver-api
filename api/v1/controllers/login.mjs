/**
 * Login controller module
 * @module controllers/login
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonschema from 'jsonschema'
import * as LDAP from 'ldap-authentication'

import * as R from '../../../lib/response.mjs'
import * as actions from '../../../lib/action.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Config from '../../../lib/config.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import DB from '../../../lib/db.mjs'

// Payload schemas
const schemaLogin = {
  "id": "/login",
  "type": "object",
  "properties": {
    "username" : { "type": "string", "maxLength": 50 },
    "password" : { "type": "string", "maxLength": 100 }
  },
  "required": ["username", "password"]
}

/**
 * Login
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
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
    const user = await DB.users.findUnique({
      where: { login: req.body.username.toLowerCase() }
    })
    if ( user===null ) {
      actions.log(req.body.username, "loginnotfound", "user", req.body.username)
      res.status(401).send(R.ko("Bad user or wrong password"))
      return
    }

    // Check if user is valid
    if ( !user.active ) {
      actions.log(req.body.username, "loginnotvalid", "user", req.body.username)
      res.status(401).send(R.ko("Bad user or wrong password"))
      return
    }

    // Validate user password
    if ( user.authmethod=="ldap" ) {
      const ldap = Config.get().ldap

      // LDAP authentication
      try {
        await LDAP.authenticate({
          ldapOpts: {
            url: `ldap://${ldap.url}:${ldap.port}`
          },
          userDn: `${ldap.userDn}=${req.body.username},${ldap.baseDn}`,
          userPassword: req.body.password
        })
      } catch (err) {
        actions.log(null, "loginfail", "user", req.body.username)
        res.status(401).send(R.ko("Bad user or wrong password"))
        return
      }
    } else {
      // Local authentication
      if ( !await( Crypt.checkPassword(req.body.password, user.secret) ) ) {
        actions.log(null, "loginfail", "user", req.body.username)
        res.status(401).send(R.ko("Bad user or wrong password"))
        return
      }
    }

    // Creates JWT token
    const token = await Auth.createToken(user.id, false)

    actions.log(user.id,"login", "user", user.id)
    res.status(200).send(R.ok({jwt:token}))
  } catch(err) {
    next(err)
  }
}
