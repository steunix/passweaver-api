/**
 * User controller module
 * @module controllers/users
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { newId } from '../../../lib/id.mjs'
import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Const from '../../../lib/const.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import * as Cache from '../../../lib/cache.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'
import * as Folder from '../../../model/folder.mjs'

import { isReadOnly } from '../../../lib/auth.mjs'

import DB from '../../../lib/db.mjs'

/**
 * Get a user
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function get (req, res, next) {
  const userid = req.params.id

  // Must be admin if reading another user
  if (req.user !== userid) {
    if (!await Auth.isAdmin(req)) {
      res.status(R.FORBIDDEN).send(R.forbidden())
      return
    }
  }

  // Search user
  const user = await DB.users.findUnique({
    where: { id: userid },
    select: {
      id: true,
      login: true,
      firstname: true,
      lastname: true,
      authmethod: true,
      locale: true,
      email: true,
      active: true,
      createdat: true,
      updatedat: true
    }
  })

  if (user === null) {
    res.status(R.NOT_FOUND).send(R.ko('User not found'))
    return
  }

  // Returns wether a personal password has been set
  user.haspersonalsecret = user.personalsecret !== null
  delete (user.personalsecret)

  res.send(R.ok(user))
}

/**
 * Get users list
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function list (req, res, next) {
  let select = null

  // Must be admin
  if (!await Auth.isAdmin(req)) {
    select = { id: true, login: true, firstname: true, lastname: true }
  }

  // Search user
  let users
  if (req.query?.search) {
    users = await DB.users.findMany({
      select,
      where: {
        OR: [
          { login: { contains: req.query.search, mode: 'insensitive' } },
          { firstname: { contains: req.query.search, mode: 'insensitive' } },
          { lastname: { contains: req.query.search, mode: 'insensitive' } }
        ]
      },
      orderBy: {
        lastname: 'asc'
      }
    })
  } else {
    users = await DB.users.findMany({
      select,
      orderBy: {
        lastname: 'asc'
      }
    })
  }

  res.send(R.ok(users))
}

/**
 * Get a user groups
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function getGroups (req, res, next) {
  const userid = req.params.id

  // Must be admin if reading another user
  if (req.user !== userid) {
    if (!await Auth.isAdmin(req)) {
      res.status(R.FORBIDDEN).send(R.forbidden())
      return
    }
  }

  const data = []

  // Search user's groups
  const groups = await DB.groupsmembers.findMany({
    where: { userid },
    include: { groups: true },
    orderBy: {
      groups: {
        description: 'asc'
      }
    }
  })

  for (const group of groups) {
    data.push(group.groups)
  }
  res.send(R.ok(data))
}

/**
 * Create a user
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function create (req, res, next) {
  // Check if system is readonly
  if (await isReadOnly(req)) {
    res.status(R.CONFLICT).send(R.conflict())
    return
  }

  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Validate payload
  if (!JV.validate(req.body, 'user_create')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // Check for login uniqueness
  const login = await DB.users.findFirst({
    where: { login: req.body.login.toLowerCase() },
    select: { id: true }
  })
  if (login) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Login already exist'))
    return
  }

  // Creates user
  const newUserId = newId()
  await DB.$transaction(async (tx) => {
    const hash = await Crypt.hashPassword(req.body.secret)
    await DB.users.create({
      data: {
        id: newUserId,
        login: req.body.login.toLowerCase(),
        firstname: req.body.firstname,
        lastname: req.body?.lastname,
        locale: req.body?.locale ?? 'en_US',
        authmethod: req.body?.authmethod ?? 'local',
        email: req.body.email.toLowerCase(),
        secret: hash,
        secretexpiresat: new Date(2050, 12, 31, 23, 59, 59)
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

  res.status(R.CREATED).send(R.ok({ id: newUserId }))
}

/**
 * Update a user
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function update (req, res, next) {
  // Check if system is readonly
  if (await isReadOnly(req)) {
    res.status(R.CONFLICT).send(R.conflict())
    return
  }

  const userid = req.params.id

  // Must be admin if updating another user
  if (req.user !== userid) {
    if (!await Auth.isAdmin(req)) {
      res.status(R.FORBIDDEN).send(R.forbidden())
      return
    }
  }

  // Validate payload
  if (!JV.validate(req.body, 'user_update')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // If not admin, the only change possible is the password
  if (!await Auth.isAdmin(req)) {
    if (!req.body.secret) {
      res.status(R.BAD_REQUEST).send(R.badRequest())
      return
    }
    req.body = { secret: req.body.secret }
  }

  // Search user
  const user = await DB.users.findUnique({
    where: { id: userid }
  })

  if (user === null) {
    res.status(R.NOT_FOUND).send(R.ko('User not found'))
    return
  }

  // Check for login uniqueness, if changed
  if (req.body.login && req.body.login !== user.login) {
    const login = await DB.users.findFirst({
      where: { login: req.body.login },
      select: { id: true }
    })
    if (login) {
      res.status(R.BAD_REQUEST).send(R.ko('Login already exist'))
      return
    }
  }

  const updateStruct = {}
  if (req.body.login) {
    updateStruct.login = req.body.login.toLowerCase()
  }
  if (req.body.firstname) {
    updateStruct.firstname = req.body.firstname
  }
  if (req.body.lastname) {
    updateStruct.lastname = req.body.lastname
  }
  if (req.body.authmethod) {
    updateStruct.authmethod = req.body.authmethod
  }
  if (req.body.locale) {
    updateStruct.locale = req.body.locale
  }
  if (req.body.email) {
    updateStruct.email = req.body.email.toLowerCase()
  }
  if (req.body.secret) {
    updateStruct.secret = await Crypt.hashPassword(req.body.secret)
    updateStruct.secretexpiresat = new Date(2050, 12, 31, 23, 59, 59)
  }
  if (Object.hasOwn(req.body, 'active')) {
    updateStruct.active = req.body.active
  }

  // Updates user
  await DB.users.update({
    data: updateStruct,
    where: {
      id: userid
    }
  })

  Events.add(req.user, Const.EV_ACTION_UPDATE, Const.EV_ENTITY_USER, userid)
  if (req.body.secret) {
    Events.add(req.user, Const.EV_ACTION_PWDUPDATE, Const.EV_ENTITY_USER, userid)
  }
  res.send(R.ok())
}

/**
 * Delete a user
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function remove (req, res, next) {
  // Check if system is readonly
  if (await isReadOnly(req)) {
    res.status(R.CONFLICT).send(R.conflict())
    return
  }

  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  const userid = req.params.id

  // Search user
  const user = await DB.users.findUnique({
    where: { id: userid }
  })

  if (user === null) {
    res.status(R.NOT_FOUND).send(R.ko('User not found'))
    return
  }

  // Admin user cannot be removed
  if (userid === Const.PW_USER_ADMINID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Admin user cannot be removed'))
    return
  }

  // Delete user
  await DB.$transaction(async (tx) => {
    // Delete user groups
    await DB.groupsmembers.deleteMany({
      where: { userid }
    })

    // Delete settings
    await DB.usersettings.deleteMany({
      where: { userid }
    })

    // Personal folders
    const personal = await DB.folders.findMany({
      where: { personal: true, userid },
      select: { id: true }
    })
    for (const pers of personal) {
      // Delete items in full text search
      await DB.$executeRaw`
        delete from itemsfts where id in (select id from items where folderid = ${pers.id})`

      // Delete items in personal folder
      await DB.items.deleteMany({
        where: { folderid: pers.id }
      })

      // Delete personal folder
      await DB.folders.delete({
        where: { id: pers.id }
      })
    }

    // Backup user
    await DB.usersdeleted.create({
      data: user
    })

    // Delete user
    await DB.users.delete({
      where: { id: userid }
    })
  })

  Events.add(req.user, Const.EV_ACTION_DELETE, Const.EV_ENTITY_USER, userid)

  await Cache.resetFoldersTree(user)
  await Cache.resetGroupsTree()

  res.send(R.ok())
}

/**
 * Get user activity
 * @param {Object} req Request
 * @param {Object} res Response
 * @param {Object} next Next
 */
export async function activity (req, res, next) {
  // Must be admin
  if (!await Auth.isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  const act = await Events.activity(req.query?.lastid, req.params.id, null, req.query?.sort)
  res.send(R.ok(act))
}

/**
 * Get the tree of visible folders for the user
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function folders (req, res, next) {
  // Only admin can query other users
  if (req.params.id !== req.user) {
    if (!await Auth.isAdmin(req)) {
      res.status(R.FORBIDDEN).send(R.forbidden())
      return
    }
  }

  const tree = await Folder.userTree(req.params.id, req.query?.permissions)
  res.send(R.ok(tree))
}
