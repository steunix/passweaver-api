/**
 * Login controller module
 * @module controllers/login
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as LDAP from 'ldapts'

import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Config from '../../../lib/config.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import * as Const from '../../../lib/const.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'
import * as Settings from '../../../lib/settings.mjs'

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

  // Check if system is locked, if not admin
  if (!await Auth.isAdmin(user.id)) {
    const settings = await Settings.get(Const.PW_USER_ADMINID)
    for (const setting of settings) {
      if (setting.setting === 'systemlock' && setting.value === '1') {
        res.status(R.UNAUTHORIZED).send(R.ko('System is locked, retry later'))
        return
      }
    }
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
        tlsOptions: ldap?.tlsOptions
      }

      // Bind to LDAP server for searching user
      let ldapClient
      try {
        ldapClient = new LDAP.Client(ldapOpts)
        await ldapClient.bind(ldap.bindDn, ldap.bindPassword)
      } catch (err) {
        res.status(R.UNAUTHORIZED).send(R.ko(err.message))
        return
      }

      // Loop in baseDNs to find user
      let authenticated = false
      for (const baseDn of ldap.baseDn) {
        const search = await ldapClient.search(baseDn, {
          filter: `(${ldap.userDn}=${req.body.username})`,
          scope: 'sub',
          attributes: [ldap.userDn]
        })

        // Authenticate user if found
        if (search.searchEntries.length > 0) {
          try {
            await ldapClient.bind(
              `${search.searchEntries[0].dn}`,
              req.body.password
            )
            authenticated = true
            break
          } catch (err) { }
        }
      }
      ldapClient.unbind()

      if (!authenticated) {
        throw new Error('User not found')
      }
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
