/**
 * Action log
 * @module src/action
 */

import { PrismaClient } from '@prisma/client'

import { randomId } from './random.mjs'
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
  const newid = randomId()

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
