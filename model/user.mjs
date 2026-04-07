/**
 * User object module
 * @module model/user
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import DB from '../lib/db.mjs'
import * as Crypt from '../lib/crypt.mjs'
import * as Events from '../lib/event.mjs'
import * as Const from '../lib/const.mjs'
import { newId } from '../lib/id.mjs'

/**
 * Return true if the user exists
 * @param {string} id User
 * @returns {boolean} True if the user exists
 */
export async function exists (id) {
  const user = await DB.users.findUnique({
    where: { id },
    select: { id: true }
  })
  return (user !== null)
}

/**
 * Return groups for a user
 * @param {string} user User
 * @returns {Array} Array of groups
 */
export async function groups (user) {
  const groups = await DB.groupsmembers.findMany({
    where: { userid: user },
    include: {
      groups: {}
    }
  })

  const array = []
  for (const rec of groups) {
    array.push(rec.groups)
  }
  return array
}

/**
 * Create a user
 * @param {string} login User login
 * @param {string} firstName User first name
 * @param {string} lastName User last name
 * @param {string} email User email
 * @param {string} locale User locale
 * @param {string} authMethod User authentication method
 * @param {string} secret User secret
 */
export async function provisionLDAP (login, firstName, lastName, email, locale, authMethod, secret) {
  // Creates user
  const newUserId = newId()
  await DB.$transaction(async (tx) => {
    const hash = await Crypt.hashPassword(secret)
    await DB.users.createMany({
      data: [{
        id: newUserId,
        login: login.toLowerCase(),
        firstname: firstName,
        lastname: lastName,
        locale: locale || 'en_US',
        authmethod: authMethod,
        email: email.toLowerCase(),
        secret: hash,
        secretexpiresat: new Date(2050, 12, 31, 23, 59, 59)
      }]
    })

    // Creates personal folder
    const newFolderId = newId()
    await DB.folders.createMany({
      data: [{
        id: newFolderId,
        description: login,
        parent: Const.PW_FOLDER_PERSONALROOTID,
        personal: true,
        userid: newUserId
      }]
    })

    // Add user to 'Everyone' group
    await DB.groupsmembers.createMany({
      data: [{
        groupid: Const.PW_GROUP_EVERYONEID,
        userid: newUserId
      }]
    })
  })

  await Events.add(newUserId, Const.EV_ACTION_LDAPPROVISION, Const.EV_ENTITY_USER, newUserId)

  return newUserId
}
