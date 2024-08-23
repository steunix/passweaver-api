/**
 * Action log
 * @module lib/action
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import DB from './db.mjs'

/**
 * Logs an action
 * @param {string} user Session user
 * @param {string} action Action type
 * @param {string} entity Entity
 * @param {string} entityid1 Primary entity id
 * @param {string} entityid2 Secondary entity id
 */
export async function add(user,action,entity,entityid1,entityid2) {
  await DB.events.create({
    data: {
      action: action,
      entity: entity,
      entityid1: entityid1,
      entityid2: entityid2,
      user: user
    }
  })

}
