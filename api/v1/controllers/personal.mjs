/**
 * Personal folder controller module
 * @module controllers/personal
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import * as Const from '../../../lib/const.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'

import DB from '../../../lib/db.mjs'

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
    if ( !JV.validate(req.body, "personal.json") ) {
      res.status(400).send(R.badRequest())
      return
    }

    // Check user
    const user = await DB.users.findUnique({
      where: { id: req.user }
    })
    if ( user===null ) {
      Events.add(req.user, Const.EV_ACTION_UNLOCKNF, Const.EV_ENTITY_USER, req.user)
      res.status(401).send(R.ko("Bad user or wrong password"))
      return
    }

    // Check password
    if ( !await( Crypt.checkPassword(req.body.password, user.personalsecret) ) ) {
      Events.add(user.id, Const.EV_ACTION_UNLOCKNV, Const.EV_ENTITY_USER, user.id)
      res.status(401).send(R.ko("Wrong password"))
      return
    }

    // Creates JWT token
    const token = await Auth.createToken(user.id, true)

    Events.add(user.id, Const.EV_ACTION_UNLOCK, Const.EV_ENTITY_USER, user.id)
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
    if ( !JV.validate(req.body, "personal") ) {
      res.status(400).send(R.badRequest())
      return
    }

    const pwd = await Crypt.hashPassword(req.body.password)
    await DB.users.update({
      where: { id: req.user },
      data: {
        personalsecret: pwd
      }
    })

    Events.add(req.user, Const.EV_ACTION_PERSCREATE, Const.EV_ENTITY_USER, req.user)
    res.status(200).send(R.ok('Done'))
  } catch (err) {
    next(err)
  }
}

