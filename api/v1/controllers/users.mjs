/**
 * User controller module
 * @module controllers/users
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonschema from 'jsonschema'

import { newId } from '../../../lib/id.mjs'
import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Const from '../../../lib/const.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import * as Cache from '../../../lib/cache.mjs'
import DB from '../../../lib/db.mjs'

// Payload schemas
const createSchema = {
  "id": "create",
  "type": "object",
  "properties": {
    "login" : { "type": "string", "maxLength": 50 },
    "firstname" : { "type": "string", "maxLength": 100 },
    "lastname": { "type": "string", "maxLength": 100 },
    "authmethod": { "type": "string", "pattern": /local|ldap/, "maxLength": 10 },
    "locale": { "type": "string", "maxLength": 10 },
    "email" : { "type": "string", "maxLength": 50 },
    "secret" : { "type": "string", "maxLength": 100 }
  },
  "required": ["login", "firstname","email","secret"]
}
const updateSchema = {
  "id": "update",
  "type": "object",
  "properties": {
    "login" : { "type": "string", "maxLength": 50 },
    "firstname" : { "type": "string", "maxLength": 100 },
    "lastname": { "type": "string", "maxLength": 100 },
    "authmethod": { "type": "string", "pattern": /local|ldap/, "maxLength": 10 },
    "locale": { "type": "string", "maxLength": 10 },
    "email" : { "type": "string", "maxLength": 50 },
    "secret" : { "type": "string", "maxLength": 100 },
    "active": { "type": "boolean" }
  }
}

/**
 * Gets a user
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function get(req, res, next) {
  try {
    const id = req.params.id

    // FIXME: admin can query any user, other only themselves; add check

    // Search user
    const user = await DB.users.findUnique({
      where: { id: id },
      select: {
        id: true,
        login: true,
        firstname: true,
        lastname: true,
        authmethod: true,
        locale: true,
        email: true,
        personalsecret: true,
        active: true,
        createdat: true,
        updatedat: true
      }
    })

    if ( user===null ) {
      res.status(404).send(R.ko("User not found"))
      return
    }

    // Returns wether a personal password has been set
    user.haspersonalsecret = user.personalsecret !== null
    delete(user.personalsecret)

    res.status(200).send(R.ok(user))
  } catch (err) {
    next(err)
  }
}

/**
 * Get users list
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function list(req, res, next) {
  try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.forbidden())
      return
    }

    const id = req.params.id

    // Search user
    var users
    if ( req.query?.search ) {
      users = await DB.users.findMany({
        where: {
          OR: [
            { login: { contains: req.query.search, mode: 'insensitive' } },
            { firstname: { contains: req.query.search, mode: 'insensitive' } },
            { lastname: { contains: req.query.search, mode: 'insensitive' } }
          ]
        },
        orderBy: {
          lastname: "asc"
        }
      })
    } else {
      users = await DB.users.findMany({
        orderBy: {
          lastname: "asc"
        }
      })
    }

    res.status(200).send(R.ok(users))
  } catch (err) {
    next(err)
  }
}

/**
 * Gets a user groups
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function getGroups(req, res, next) {
  try {
    const id = req.params.id

    // FIXME: admin can query any user, other only themselves; add check

    var data = []

    // Search user's groups
    const groups = await DB.groupsmembers.findMany({
      where: { userid: id },
      include: { groups: true },
      orderBy: {
        groups: {
          description: "asc"
        }
      }
    })

    for ( const group of groups ) {
      data.push(group.groups)
    }
    res.status(200).send(R.ok(data))
  } catch (err) {
    next(err)
  }
}

/**
 * Create a user
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function create(req, res, next) {
  try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.forbidden())
      return
    }

    // Validate payload
    const validate = jsonschema.validate(req.body, createSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.badRequest())
      return
    }

    // Check for login uniqueness
    const login = await DB.users.findFirst({
      where: { login: req.body.login.toLowerCase() },
      select: { id: true }
    })
    if ( login ) {
      res.status(422).send(R.ko("Login already exist"))
      return
    }

    // Creates user
    const newUserId = newId()
    await DB.$transaction(async(tx)=> {
      const hash = await Crypt.hashPassword(req.body.secret)
      await DB.users.create({
        data: {
          id: newUserId,
          login: req.body.login.toLowerCase(),
          firstname: req.body.firstname,
          lastname: req.body?.lastname,
          locale: req.body?.locale ?? "en_US",
          authmethod: req.body?.authmethod ?? "local",
          email: req.body.email.toLowerCase(),
          secret: hash,
          secretexpiresat: new Date(2050,12,31,23,59,59)
        }
      })

      // Creates personal folder
      const newFolderId = newId()
      await DB.folders.create({
        data: {
          id: newFolderId,
          description: req.body.login,
          parent: Const.PW_FOLDER_PERSONALROOTID,
          personal: true,
          userid: newUserId
        }
      })

      // Add user to 'Everyone' group
      await DB.groupsmembers.create({
        data: {
          groupid: Const.PW_GROUP_EVERYONEID,
          userid: newUserId
        }
      })
    })

    Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_USER, newUserId)
    await Cache.resetFoldersTree()

    res.status(201).send(R.ok({id: newUserId}))
  } catch (err) {
    next(err)
  }
}

/**
 * Update a user
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function update(req, res, next) {
  try {
    const id = req.params.id

    // Must be admin if updating another user
    if ( req.user != id ) {
      if ( !await Auth.isAdmin(req) ) {
        res.status(403).send(R.forbidden())
        return
      }
    }

    // Validate payload
    const validate = jsonschema.validate(req.body, updateSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.badRequest())
      return
    }

    // If not admin, the only change possible is the password
    if ( !await Auth.isAdmin(req) ) {
      if ( !req.body.secret ) {
        res.status(400).send(R.badRequest())
        return
      }
      req.body = { "secret": req.body.secret }
    }

    // Search user
    const user = await DB.users.findUnique({
      where: { id: id }
    });

    if ( user===null ) {
      res.status(404).send(R.ko("User not found"))
      return
    }

    // Check for login uniqueness, if changed
    if ( req.body.login && req.body.login != user.login ) {
      const login = DB.users.findFirst({
        where: { login: req.body.login },
        select: { id: true }
      })
      if ( login ) {
        res.status(400).send(R.ko("Login already exist"))
        return
      }
    }

    let updateStruct = {}
    if ( req.body.login ) {
      updateStruct.login = req.body.login.toLowerCase()
    }
    if ( req.body.firstname ) {
      updateStruct.firstname = req.body.firstname
    }
    if ( req.body.lastname ) {
      updateStruct.lastname = req.body.lastname
    }
    if ( req.body.authmethod ) {
      updateStruct.authmethod = req.body.authmethod
    }
    if ( req.body.locale ) {
      updateStruct.locale = req.body.locale
    }
    if ( req.body.email ) {
      updateStruct.email = req.body.email.toLowerCase()
    }
    if ( req.body.secret ) {
      updateStruct.secret = await Crypt.hashPassword(req.body.secret)
      updateStruct.secretexpiresat = new Date(2050,12,31,23,59,59)
    }
    if ( req.body.hasOwnProperty("active") ) {
      updateStruct.active = req.body.active
    }

    // Updates user
    await DB.users.update({
      data: updateStruct,
      where: {
        id: id
      }
    })

    Events.add(req.user, Const.EV_ACTION_UPDATE, Const.EV_ENTITY_USER, id)
    res.status(200).send(R.ok())
  } catch (err) {
    next(err)
  }
}

/**
 * Delete a user
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function remove(req, res, next) {
  try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.forbidden())
      return
    }

    const id = req.params.id

    // Search user
    const user = await DB.users.findUnique({
      where: { id: id },
      select: { id: true }
    })

    if ( user===null ) {
      res.status(404).send(R.ko("User not found"))
      return
    }

    // Admin user cannot be removed
    if ( id==Const.PW_USER_ADMINID ) {
      res.status(422).send(R.ko("Admin user cannot be removed"))
      return
    }

    // Search user personal folders
    await DB.$transaction(async(tx)=> {
      // Delete user groups
      await DB.groupsmembers.deleteMany({
        where: { userid: id }
      })

      // Delete settings
      await DB.usersettings.deleteMany({
        where: { userid: id }
      })

      // Personal folders
      const personal = await DB.folders.findMany({
        where: { personal: true, userid: id },
        select: { id: true }
      })
      for ( const pers of personal ) {
        // Delete items in personal folder
        await DB.items.deleteMany({
          where: { folderid: pers.id }
        })

        // Delete personal folder
        await DB.folders.delete({
          where: { id: pers.id }
        })
      }

      // Deletes user
      await DB.users.delete({
        where: { id: id }
      })

    })

    Events.add(req.user, Const.EV_ACTION_DELETE, Const.EV_ENTITY_USER, id)

    await Cache.resetFoldersTree(user)
    await Cache.resetGroupsTree()

    res.status(200).send(R.ok('Done'))
  } catch (err) {
    next(err)
  }
}

