/**
 * Personal folder controller module
 * @module controllers/personal
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonschema from 'jsonschema'

import * as R from '../../../lib/response.mjs'
import * as actions from '../../../lib/action.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import DB from '../../../lib/db.mjs'

// Payload schemas
const personalSchema = {
  "id": "unlock",
  "type": "object",
  "properties": {
    "password" : { "type": "string" }
  },
  "required": ["password"]
}

/**
 * Personal folder unlock
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function unlock(req, res, next) {
  try {
    // Validate payload
    const validate = jsonschema.validate(req.body, personalSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    // Check user
    const user = await DB.users.findUnique({
      where: { id: req.user }
    })
    if ( user===null ) {
      actions.log(req.body.username, "personalunlocknotfound", "user", req.user)
      res.status(401).send(R.ko("Bad user or wrong password"))
      return
    }

    // Check password
    if ( !await( Crypt.checkPassword(req.body.password, user.personalsecret) ) ) {
      actions.log(null, "personalunlockfail", "user", req.user)
      res.status(401).send(R.ko("Wrong password"))
      return
    }

    // Creates JWT token
    const token = await Auth.createToken(user.id, true)

    actions.log(user.id,"personalunlock", "user", user.id)
    res.status(200).send(R.ok({jwt:token}))
  } catch(err) {
    next(err)
  }
}

/**
 * Set user personal password
 * @param {*} req Express request
 * @param {*} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function setPassword(req, res, next) {
  try {
    const validate = jsonschema.validate(req.body, personalSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    const pwd = await Crypt.hashPassword(req.body.password)
    await DB.users.update({
      where: { id: req.user },
      data: {
        personalsecret: pwd
      }
    })

    actions.log(req.user, "personalpasswordcreate", "user", req.user)
    res.status(200).send(R.ok('Done'))
  } catch (err) {
    next(err)
  }
}

