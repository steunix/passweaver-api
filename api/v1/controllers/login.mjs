/**
 * Login controller module
 * @module controllers/login
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as LDAP from 'ldap-authentication'

import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Config from '../../../lib/config.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import * as Const from '../../../lib/const.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'
import * as FS from 'fs'

import DB from '../../../lib/db.mjs'

/**
 * Login
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function login (req, res, next) {
  // Validate payload
  if (!JV.validate(req.body, 'login')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // Check user
  const user = await DB.users.findUnique({
    where: { login: req.body.username.toLowerCase() }
  })
  if (user === null) {
    Events.add(req.body.username, Const.EV_ACTION_LOGINNF, Const.EV_ENTITY_USER, req.body.username)
    res.status(R.UNAUTHORIZED).send(R.ko('Bad user or wrong password'))
    return
  }

  // Check if user is valid
  if (!user.active) {
    Events.add(req.body.username, Const.EV_ACTION_LOGINNV, Const.EV_ENTITY_USER, req.body.username)
    res.status(R.UNAUTHORIZED).send(R.ko('Bad user or wrong password'))
    return
  }

  // Validate user password
  if (user.authmethod === 'ldap') {
    const ldap = Config.get().ldap

    // LDAP authentication
    try {
      const ldapOpts = {
        url: `${ldap.url}:${ldap.port}`,
        tlsOptions: {}
      }

      if (ldap?.tlsOptions?.cert) {
        ldapOpts.tlsOptions.cert = FS.readFileSync(ldap.tlsOptions.cert)
        ldapOpts.tlsOptions.ciphers = 'DEFAULT@SECLEVEL=0'
      }

      if (ldap?.tlsOptions?.ca) {
        ldapOpts.tlsOptions.ca = FS.readFileSync(ldap.tlsOptions.ca)
      }

      if (ldap?.tlsOptions?.ciphers) {
        ldapOpts.tlsOptions.ciphers = ldap.tlsOptions.ciphers
      }

      await LDAP.authenticate({
        ldapOpts,
        userDn: `${ldap.userDn}=${req.body.username},${ldap.baseDn}`,
        userPassword: req.body.password
      })
    } catch (err) {
      Events.add(null, Const.EV_ACTION_LOGINFAILED, Const.EV_ENTITY_USER, req.body.username)
      res.status(R.UNAUTHORIZED).send(R.ko('Bad user or wrong password'))
      return
    }
  } else {
    // Local authentication
    if (!await Crypt.checkPassword(req.body.password, user.secret)) {
      Events.add(null, Const.EV_ACTION_LOGINFAILED, Const.EV_ENTITY_USER, req.body.username)
      res.status(R.UNAUTHORIZED).send(R.ko('Bad user or wrong password'))
      return
    }
  }

  // Creates JWT token
  const token = await Auth.createToken(user.id, false)

  Events.add(user.id, Const.EV_ACTION_LOGIN, Const.EV_ENTITY_USER, user.id)
  res.send(R.ok({ jwt: token }))
}
