/**
 * Login controller module
 * @module controllers/login
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
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
import * as ApiKey from '../../../model/apikey.mjs'
import * as Metrics from '../../../lib/metrics.mjs'
import * as Folder from '../../../model/folder.mjs'

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

  const data = {
    username: req.body.username?.toLowerCase() || '',
    password: req.body?.password || '',
    apikey: req.body?.apikey || '',
    secret: req.body?.secret || ''
  }

  // If an API key is provided, validate it and get the user
  let isapikey = false
  if (data.apikey && data.secret) {
    if (!await ApiKey.exists(data.apikey)) {
      await Events.add(data.username, Const.EV_ACTION_LOGIN_APIKEY_NOTFOUND, Const.EV_ENTITY_APIKEY, data.apikey)
      res.status(R.UNAUTHORIZED).send(R.ko('Bad API key'))
      return
    }
    if (!await ApiKey.checkSecret(data.apikey, data.secret)) {
      await Events.add(data.username, Const.EV_ACTION_LOGIN_APIKEY_FAILED, Const.EV_ENTITY_APIKEY, data.apikey)
      res.status(R.UNAUTHORIZED).send(R.ko('Bad API key secret'))
      return
    }

    // Search the API key and check if it is active
    const apik = await DB.apikeys.findUnique({
      where: { id: data.apikey },
      select: { userid: true, active: true, ipwhitelist: true, timewhitelist: true }
    })
    if (!apik.active) {
      await Events.add(data.username, Const.EV_ACTION_LOGIN_APIKEY_NOTVALID, Const.EV_ENTITY_APIKEY, data.apikey)
      res.status(R.UNAUTHORIZED).send(R.ko('API key not valid'))
      return
    }

    // Check if IP is whitelisted
    if (apik.ipwhitelist) {
      const clientIp = req.connection.remoteAddress
      if (!ApiKey.checkIPWhitelist(apik.ipwhitelist, clientIp)) {
        await Events.add(data.username, Const.EV_ACTION_LOGIN_APIKEY_IPNOTWHITELISTED, Const.EV_ENTITY_APIKEY, data.apikey)
        res.status(R.UNAUTHORIZED).send(R.ko('API key not valid'))
        return
      }
    }

    // Check if time is whitelisted
    if (apik.timewhitelist) {
      if (!ApiKey.checkTimeWhitelist(apik.timewhitelist)) {
        await Events.add(data.username, Const.EV_ACTION_LOGIN_APIKEY_TIMENOTWHITELISTED, Const.EV_ENTITY_APIKEY, data.apikey)
        res.status(R.UNAUTHORIZED).send(R.ko('API key not valid'))
        return
      }
    }

    // Get corresponding user
    const user = await DB.users.findUnique({
      where: { id: apik.userid },
      select: { login: true, authmethod: true }
    })

    // Mark lastused on API key
    await DB.apikeys.update({
      where: { id: data.apikey },
      data: { lastusedat: new Date() }
    })

    // Add event
    await Events.add(apik.userid, Const.EV_ACTION_LOGIN_APIKEY, Const.EV_ENTITY_APIKEY, data.apikey)

    data.username = user.login
    isapikey = true
  }

  // Check user
  const user = await DB.users.findUnique({
    where: { login: data.username }
  })
  if (user === null) {
    await Events.add(data.username, Const.EV_ACTION_LOGIN_USERNOTFOUND, Const.EV_ENTITY_USER, data.username)
    res.status(R.UNAUTHORIZED).send(R.ko('Bad user or wrong password'))
    return
  }

  // Check if system is locked, if not admin
  if (!await Auth.isAdmin(user.id)) {
    const settings = await Settings.get(Const.PW_USER_ADMINID)
    for (const setting of settings) {
      if (setting.setting === Const.SYSTEM_LOCK && setting.value === '1') {
        res.status(R.UNAUTHORIZED).send(R.ko('System is locked, retry later'))
        return
      }
    }
  }

  // Check if user is valid
  if (!user.active) {
    await Events.add(data.username, Const.EV_ACTION_LOGIN_USERNOTVALID, Const.EV_ENTITY_USER, data.username)
    res.status(R.UNAUTHORIZED).send(R.ko('Bad user or wrong password'))
    return
  }

  // Validate user password
  let ldapClient
  if (!isapikey && user.authmethod === 'ldap') {
    const ldap = Config.get().ldap

    // LDAP authentication
    try {
      const ldapOpts = {
        url: `${ldap.url}:${ldap.port}`,
        tlsOptions: ldap?.tlsOptions
      }

      // Bind to LDAP server for searching user
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
          filter: `(${ldap.userDn}=${data.username})`,
          scope: 'sub',
          attributes: [ldap.userDn]
        })

        // Authenticate user if found
        if (search.searchEntries.length > 0) {
          try {
            await ldapClient.bind(
              `${search.searchEntries[0].dn}`,
              data.password
            )
            authenticated = true
            break
          } catch (err) { }
        }
      }

      if (!authenticated) {
        throw new Error('User not found')
      }
    } catch (err) {
      await Events.add(null, Const.EV_ACTION_LOGINFAILED, Const.EV_ENTITY_USER, data.username)
      res.status(R.UNAUTHORIZED).send(R.ko('Bad user or wrong password'))
      return
    } finally {
      ldapClient.unbind()
    }
  }

  // Local authentication
  if (!isapikey && user.authmethod === 'local') {
    if (!await Crypt.checkPassword(data.password, user.secret)) {
      await Events.add(null, Const.EV_ACTION_LOGINFAILED, Const.EV_ENTITY_USER, data.username)
      res.status(R.UNAUTHORIZED).send(R.ko('Bad user or wrong password'))
      return
    }
  }

  // API key method check
  if ((!isapikey && user.authmethod === 'apikey') || (isapikey && user.authmethod !== 'apikey')) {
    await Events.add(null, Const.EV_ACTION_LOGINFAILED, Const.EV_ENTITY_USER, data.username)
    res.status(R.UNAUTHORIZED).send(R.ko('Bad user or wrong password'))
    return
  }

  // Creates JWT token
  const token = await Auth.createToken(user.id, false)

  Metrics.counterInc(isapikey ? Const.METRICS_LOGIN_APIKEYS : Const.METRICS_LOGIN_USERS)

  // Create user tree cache
  await Folder.userTree(user.id)

  await Events.add(user.id, Const.EV_ACTION_LOGIN, Const.EV_ENTITY_USER, user.id)
  res.send(R.ok({ jwt: token }))
}
