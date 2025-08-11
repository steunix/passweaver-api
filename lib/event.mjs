/**
 * Action log
 * @module lib/action
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import DB from './db.mjs'
import * as Const from './const.mjs'
import { Prisma } from '../generated/prisma/index.js'

/**
 * Log an action
 * @param {string} user Session user
 * @param {string} action Action type
 * @param {string} entity Entity
 * @param {string} entityid1 Primary entity id
 * @param {string} entityid2 Secondary entity id
 * @param {string} note Note
 */
export async function add (user, action, entity, entityid1, entityid2, note) {
  await DB.events.create({
    data: {
      action,
      entity,
      entityid1,
      entityid2,
      user,
      note
    }
  })
}

/**
 * Return one page (50 records) of activity, filtered by userid and or itemid
 * @param {*} lastid Start from this event id, excluded
 * @param {*} userid User filter
 * @param {*} itemid Item filter
 * @param {*} sort 0: descendent, 1: ascendent
 * @returns
 */
export async function activity (lastid, userid, itemid, sort) {
  const activity = await DB.$queryRaw`
    select ev.*, usr.lastname||' '||usr.firstname user_description,
      coalesce(itm.title, fld.description, usrs.login, itp.description, grpmembers.description||' / '||members.login, grp.description) description
    from   events ev
    left   join users usr
    on     ev."user" = usr.id
    left   join items itm
    on     itm.id = ev.entityid1
    and    ev.entity = ${Const.EV_ENTITY_ITEM}
    left   join folders fld
    on     fld.id = ev.entityid1
    and    ev.entity in (${Const.EV_ENTITY_FOLDER}, ${Const.EV_ENTITY_PERSONALFOLDER})
    left   join users usrs
    on     usrs.id = ev.entityid1
    and    ev.entity = ${Const.EV_ENTITY_USER}
    left   join itemtypes itp
    on     itp.id::varchar = ev.entityid1
    and    ev.entity = ${Const.EV_ENTITY_ITEMTYPE}
    left   join "groups" grp
    on     grp.id = ev.entityid1
    and    ev.entity in (${Const.EV_ENTITY_GROUP}, ${Const.EV_ENTITY_PERMISSIONS})
    left   join "groups" grpmembers
    on     grpmembers.id = ev.entityid1
    and    ev.entity = ${Const.EV_ENTITY_PERMISSIONS}
    left   join users members
    on     members.id = ev.entityid2
    and    ev.entity = ${Const.EV_ENTITY_PERMISSIONS}
    where  1 = 1
    ${lastid && sort === 1 ? Prisma.sql` and ev.id > ${lastid}::uuid ` : Prisma.empty}
    ${lastid && sort !== 0 ? Prisma.sql` and ev.id < ${lastid}::uuid ` : Prisma.empty}
    ${userid ? Prisma.sql` and ev.user = ${userid} ` : Prisma.empty}
    ${itemid ? Prisma.sql` and ev.entityid1 = ${itemid} and ev.entity = ${Const.EV_ENTITY_ITEM}` : Prisma.empty}
    order by ev.id ${sort === 1 ? Prisma.sql` asc ` : Prisma.sql` desc `}
    limit 50
  `

  const data = []
  for (const event of activity) {
    const ev = { ...event }

    ev.timestamp = event.timestamp.toISOString()
    ev.action_description = Const.actionDescriptions[event.action]
    ev.entity_description = Const.entityDescriptions[event.entity]

    data.push(ev)
  }

  return data
}
