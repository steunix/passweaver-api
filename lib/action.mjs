/**
 * Action log
 * @module lib/action
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { newId } from './id.mjs'
import DB from './db.mjs'

/**
 * Logs an action
 * @param {string} user Session user
 * @param {string} action Action type
 * @param {string} itemtype Item type
 * @param {string} itemid Item id
 */
export async function log(user,action,itemtype,itemid) {
  const newid = newId()

  await DB.actionLog.create({
    data: {
      id: newid,
      action: action,
      itemtype: itemtype,
      itemid: itemid,
      user: user
    }
  })

}
