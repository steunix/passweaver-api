/**
 * Action log
 * @module src/action
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaClient } from '@prisma/client'

import { newId } from './id.mjs'
import * as Config from '../src/config.mjs'

const prisma = new PrismaClient(Config.get().prisma_options)

/**
 * Logs an action
 * @param {string} user Session user
 * @param {string} action Action type
 * @param {string} itemtype Item type
 * @param {string} itemid Item id
 */
export async function log(user,action,itemtype,itemid) {
  const newid = newId()

  await prisma.actionLog.create({
    data: {
      id: newid,
      action: action,
      itemtype: itemtype,
      itemid: itemid,
      user: user
    }
  });
}
