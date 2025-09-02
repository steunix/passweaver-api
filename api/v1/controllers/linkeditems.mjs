/**
 * Linked items controller module
 * @module controllers/linkeditems
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { newId } from '../../../lib/id.mjs'
import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Item from '../../../model/item.mjs'
import * as Folder from '../../../model/folder.mjs'
import * as Const from '../../../lib/const.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'
import * as Metrics from '../../../lib/metrics.mjs'

import { isAdmin, isReadOnly } from '../../../lib/auth.mjs'

import DB from '../../../lib/db.mjs'

/**
 * Create a linked item
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function create (req, res, next) {
  // Check if system is readonly
  if (await isReadOnly(req)) {
    res.status(R.CONFLICT).send(R.conflict())
    return
  }

  // Admins have no access to items
  if (await isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Validate payload
  if (!JV.validate(req.body, 'linkeditem_create')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  const folder = req.params.folder

  // Search folder
  if (!await Folder.exists(folder)) {
    res.status(R.NOT_FOUND).send(R.ko('Folder not found'))
    return
  }

  // No items on root or personal folders root
  if (folder === Const.PW_FOLDER_PERSONALROOTID || folder === Const.PW_FOLDER_ROOTID) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('You cannot create linked items in this folder'))
    return
  }

  // Check write permissions on folder
  const perm = await Folder.permissions(folder, req.user)
  if (!perm.write) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Check if personal
  if (await Folder.isPersonal(folder)) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('You cannot create linked items in this folder'))
    return
  }

  // Get linked item
  const linkedItem = await DB.items.findUnique({
    where: { id: req.body.linkeditemid }
  })

  if (linkedItem === null) {
    res.status(R.NOT_FOUND).send(R.ko('Linked item not found'))
    return
  }

  // Check linked item is not personal
  if (linkedItem.personal) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('You cannot create linked items from a personal item'))
    return
  }

  // Creates the item
  const newid = newId()
  await DB.items.create({
    data: {
      id: newid,
      folderid: folder,
      personal: false,
      kmsid: null,
      dek: null,
      kekversion: null,
      title: linkedItem.title,
      type: null,
      algo: null,
      data: '.',
      dataiv: '.',
      dataauthtag: '.',
      metadata: linkedItem.metadata,
      linkeditemid: linkedItem.id
    }
  })

  // Update tsvector on original item
  await Item.updateFTS(req.body.linkeditemid)

  await Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_ITEM, newid)
  Metrics.counterInc(Const.METRICS_ITEMS_CREATED)
  res.status(R.CREATED).send(R.ok({ id: newid }))
}
