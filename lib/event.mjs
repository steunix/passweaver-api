/**
 * Action log
 * @module lib/action
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import DB from './db.mjs'
import * as Const from './const.mjs'

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

/**
 * Return one page (100 record) of activity, filter by userid and or itemid
 * @param {*} fromeventid Start from this event id, excluded
 * @param {*} userid User filter
 * @param {*} itemid Item filter
 * @param {*} sort 0: descendent, 1: ascendent
 * @returns
 */
export async function activity(fromeventid, userid, itemid, sort) {

  let where = []
  if ( fromeventid ) {
    if ( sort===1 ) {
      where.push({ id: { gt: fromeventid }})
    } else {
      where.push({ id: { lt: fromeventid }})
    }
  }
  if ( userid ) {
    where.push({ user: userid })
  }
  if ( itemid ) {
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
      id: sort===1 ? "asc" : "desc"
    }
  })

  for ( var event of events ) {
    event.timestamp = event.timestamp.toISOString()
    event.action_description = Const.actionDescriptions[event.action]
    event.entity_description = Const.entityDescriptions[event.entityid1]

    const u = users.find( (el)=>{ return el.id == event.user } )
    event.user_description = (u?.lastname + ' ' + u?.firstname).trim()

    if ( event.entity==Const.EV_ENTITY_ITEM ) {
      const item = await DB.items.findUnique(
        { where: { id: event.entityid1 } },
        { select: { title: true} }
      )
      event.item_description = item[0]?.title
    } else {
      event.item_description = null
    }
  }

  return events
}