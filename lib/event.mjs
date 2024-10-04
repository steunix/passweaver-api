/**
 * Action log
 * @module lib/action
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import DB from './db.mjs'
import * as Const from './const.mjs'

/**
 * Log an action
 * @param {string} user Session user
 * @param {string} action Action type
 * @param {string} entity Entity
 * @param {string} entityid1 Primary entity id
 * @param {string} entityid2 Secondary entity id
 */
export async function add (user, action, entity, entityid1, entityid2) {
  await DB.events.create({
    data: {
      action,
      entity,
      entityid1,
      entityid2,
      user
    }
  })
}

/**
 * Return one page (100 record) of activity, filtered by userid and or itemid
 * @param {*} lastid Start from this event id, excluded
 * @param {*} userid User filter
 * @param {*} itemid Item filter
 * @param {*} sort 0: descendent, 1: ascendent
 * @returns
 */
export async function activity (lastid, userid, itemid, sort) {
  const where = []
  if (lastid) {
    if (sort === 1) {
      where.push({ id: { gt: lastid } })
    } else {
      where.push({ id: { lt: lastid } })
    }
  }
  if (userid) {
    where.push({ user: userid })
  }
  if (itemid) {
    where.push({ entityid1: itemid })
    where.push({ entity: Const.EV_ENTITY_ITEM })
  }

  const users = await DB.users.findMany({
    select: {
      id: true,
      lastname: true,
      firstname: true
    }
  })

  const events = await DB.events.findMany({
    take: 50,
    where: {
      AND: where
    },
    orderBy: {
      id: sort === 1 ? 'asc' : 'desc'
    }
  })

  const data = []
  for (const event of events) {
    const ev = { ...event }

    ev.timestamp = event.timestamp.toISOString()
    ev.action_description = Const.actionDescriptions[event.action]
    ev.entity_description = Const.entityDescriptions[event.entity]

    const u = users.find((el) => { return el.id === event.user })
    ev.user_description = (u?.lastname + ' ' + u?.firstname).trim() || event.user

    if (event.entity === Const.EV_ENTITY_ITEM) {
      const item = await DB.items.findUnique(
        { where: { id: event.entityid1 } },
        { select: { title: true } }
      )
      ev.item_title = item?.title || event.entityid1
    } else {
      ev.item_title = null
    }
    data.push(ev)
  }

  return data
}
