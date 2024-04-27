/**
 * User controller module
 * @module controllers/users
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonschema from 'jsonschema'

import { newId } from '../../../lib/id.mjs'
import * as R from '../../../lib/response.mjs'
import * as actions from '../../../lib/action.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import * as Cache from '../../../lib/cache.mjs'
import * as Const from '../../../lib/const.mjs'
import DB from '../../../lib/db.mjs'

// Payload schema
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
const updatePersonalPassword = {
  "id": "update",
  "type": "object",
  "properties": {
    "personalsecret" : { "type": "string" }
  },
  "required": ["personalsecret"]
}

const personalLogin = {
  "id": "/login",
  "type": "object",
  "properties": {
    "password" : { "type": "string" }
  },
  "required": ["password"]
}

/**
 * Gets a user
 * @param {object} req Express request
 * @param {object} res Express response
 */
export async function get(req, res, next) {
  try {
    const id = req.params.id

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
 */
export async function list(req, res, next) {
  try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
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
 */
export async function getGroups(req, res, next) {
  try {
    const id = req.params.id

    var data = []

    // Search user's groups
    const groups = await DB.usersGroups.findMany({
      where: { user: id },
      include: { Groups: true },
      orderBy: {
        Groups: {
          description: "asc"
        }
      }
    })

    for ( const group of groups ) {
      data.push(group.Groups)
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
 */
export async function create(req, res, next) {
  try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    // Validate payload
    const validate = jsonschema.validate(req.body, createSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    // Creates user
    const newid = newId()
    const hash = await Crypt.hashPassword(req.body.secret)
    await DB.users.create({
      data: {
        id: newid,
        login: req.body.login,
        firstname: req.body.firstname,
        lastname: req.body?.lastname,
        locale: req.body?.locale ?? "en_US",
        authmethod: req.body?.authmethod ?? "local",
        email: req.body.email,
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
        user: newid
      }
    })

    // Add user to 'Everyone' group
    const newid2 = newId()
    await DB.usersGroups.create({
      data: {
        id: newid2,
        group: Const.PW_GROUP_EVERYONEID,
        user: newid
      }
    })

    actions.log(req.user, "create", "user", newid)
    Cache.resetFoldersTree()

    res.status(201).send(R.ok({id: newid}))
  } catch (err) {
    next(err)
  }
}

/**
 * Update a user
 * @param {object} req Express request
 * @param {object} res Express response
 */
export async function update(req, res, next) {
  try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    // Validate payload
    const validate = jsonschema.validate(req.body, updateSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    const id = req.params.id

    // Search user
    const user = await DB.users.findUnique({
      where: { id: id }
    });

    if ( user===null ) {
      res.status(404).send(R.ko("User not found"))
      return
    }

    let updateStruct = {}
    if ( req.body.login ) {
      updateStruct.login = req.body.login
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
      updateStruct.email = req.body.email
    }
    if ( req.body.secret ) {
      updateStruct.secret = await Crypt.hashPassword(req.body.secret)
      updateStruct.secretexpiresat = new Date(2050,12,31,23,59,59)
    }
    if ( req.body.hasOwnProperty("active") ) {
      updateStruct.active = req.body.active
    }

    // Updates
    await DB.users.update({
      data: updateStruct,
      where: {
        id: id
      }
    })

    actions.log(req.user, "update", "user", id)
    res.status(200).send(R.ok())
  } catch (err) {
    next(err)
  }
}

/**
 * Delete a user
 * @param {object} req Express request
 * @param {object} res Express response
 */
export async function remove(req, res, next) {
  try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    const id = req.params.id

    // Search user
    const user = await DB.users.findUnique({
      where: { id: id }
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
    const personal = await DB.folders.findMany({
      where: { personal: true, user: id }
    })
    const personalId = personal.length ? personal[0].id : ""

    await DB.$transaction(async(tx)=> {
      // Deletes user groups
      await DB.usersGroups.deleteMany({
        where: { user: id }
      })

      if ( personalId ) {
        // Deletes items in personal folder
        await DB.items.deleteMany({
          where: { folder: personalId }
        })

        // Deletes personal folder
        await DB.folders.delete({
          where: { id: personalId }
        })
      }

      // Deletes user
      await DB.users.delete({
        where: { id: id }
      })

    })

    actions.log(req.user, "delete", "folder", id)
    Cache.resetFoldersTree()
    Cache.resetGroupsTree()

    res.status(200).send(R.ok('Done'))
  } catch (err) {
    next(err)
  }
}

/**
 * Set user personal password
 * @param {*} req Express request
 * @param {*} res Express response
 * @param {*} next Next
 * @returns
 */
export async function setPersonalSecret(req, res, next) {
  try {
    const validate = jsonschema.validate(req.body, updatePersonalPassword)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    const pwd = await Crypt.hashPassword(req.body.personalsecret)
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

/**
 * Personal folder login
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function personalFolderLogin(req, res, next) {
  try {
    // Validate payload
    const validate = jsonschema.validate(req.body, personalLogin)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    // Check user
    const user = await DB.users.findUnique({
      where: { id: req.user }
    })
    if ( user===null ) {
      actions.log(req.body.username, "personalloginnotfound", "user", req.user)
      res.status(401).send(R.ko("Bad user or wrong password"))
      return
    }

    // Check password
    if ( !await( Crypt.checkPassword(req.body.password, user.personalsecret) ) ) {
      actions.log(null, "personalloginfail", "user", req.user)
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
