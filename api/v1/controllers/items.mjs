/**
 * Items controller module
 * @module controllers/items
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Prisma } from '../../../generated/prisma/index.js'

import { newId } from '../../../lib/id.mjs'
import * as R from '../../../lib/response.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Item from '../../../model/item.mjs'
import * as Folder from '../../../model/folder.mjs'
import * as Crypt from '../../../lib/crypt.mjs'
import * as Cache from '../../../lib/cache.mjs'
import * as Const from '../../../lib/const.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'

import { isAdmin, isReadOnly } from '../../../lib/auth.mjs'

import DB from '../../../lib/db.mjs'

/**
 * Check if a personal secret has been set or used in a given session
 * @param {*} req Express request
 * @returns 0: OK, 412: Personal password not set, 417: Personal folder locked
 */
async function checkPersonalAccess (req) {
  // Validate personal key, if present
  if (req.personaltoken) {
    const valid = Auth.validatePersonalToken(req.personaltoken)
    return valid ? 0 : R.UNAUTHORIZED
  }

  const user = await DB.users.findUnique({
    where: { id: req.user },
    select: { personalsecret: true }
  })

  // User has not defined its personal secret yet
  if (user.personalsecret === null) {
    return R.PRECONDITION_FAILED
  }

  // User has set the password, but has not unlocked yet
  return R.EXPECTATION_FAILED
}

/**
 * Get an item
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function get (req, res, next) {
  const itemid = req.params.id

  // Check supplied key
  let key
  try {
    key = Buffer.from(req.query?.key, 'base64')
    if (key.length !== 32) {
      throw new Error('Invalid key length')
    }
  } catch (e) {
    res.status(R.BAD_REQUEST).send(R.badRequest('Invalid key'))
    return
  }

  // Admins have no access to items
  if (await isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Search item
  const item = await DB.items.findUnique({
    where: { id: itemid }
  })

  if (item === null) {
    res.status(R.NOT_FOUND).send(R.ko('Item not found'))
    return
  }

  // If personal item, ensure personal password has been set and activated
  if (item.personal) {
    const check = await checkPersonalAccess(req)
    if (check !== 0) {
      res.status(check).send(R.ko('Personal folder not accessible'))
      return
    }
  }

  // Check read permissions on folder
  const perm = await Folder.permissions(item.folderid, req.user)
  if (!perm.read) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Decrypt content
  try {
    item.data = await Item.decrypt(itemid, req)
  } catch (e) {
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('This item is corrupted and cannot be decrypted'))
    return
  }

  // Reencrypt data with input token
  item.data = Crypt.encryptedPayload(key, item.data)

  // Removes unneeded info
  delete (item.dataauthtag)
  delete (item.dataiv)
  delete (item.algo)

  item.favorite = await Item.isFavorite(itemid, req.user)

  // Update last accessed on item
  await DB.items.update({
    data: {
      accessedat: new Date()
    },
    where: {
      id: itemid
    }
  })

  Events.add(req.user, Const.EV_ACTION_READ, Const.EV_ENTITY_ITEM, itemid)
  res.send(R.ok(item))
}

/**
 * Get folder items list
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function list (req, res, next) {
  // Admins have no access to items
  if (await isAdmin(req)) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  const folder = req.params?.folder
  const search = req.query?.search ?? ''
  const type = req.query?.type ?? ''
  const favorite = req.query?.favorite ?? ''

  let limit = parseInt(req.query?.limit) || 100
  if (limit > 100) {
    limit = 100
  }

  let folders

  if (folder) {
    // Single folder search, if from .../folder/items
    if (!await Folder.exists(folder)) {
      res.status(R.NOT_FOUND).send(R.ko('Folder not found'))
      return
    }

    // Check read permissions on folder
    const perm = await Folder.permissions(folder, req.user)
    if (!perm.read) {
      res.status(R.FORBIDDEN).send(R.forbidden())
      return
    }

    const fld = await DB.folders.findUnique({
      where: { id: folder },
      select: { personal: true }
    })

    // Admin can see all folders, but cannot access any personal folder
    if (fld.personal && req.user === Const.PW_USER_ADMINID) {
      res.status(R.FORBIDDEN).send(R.forbidden())
      return
    }

    // If personal folder, ensure personal password has been set and activated
    if (fld.personal) {
      const check = await checkPersonalAccess(req)
      if (check !== 0) {
        res.status(check).send(R.ko('Personal folder not accessible'))
        return
      }
    }

    folders = [req.params.folder]
  } else {
    // If no folder is specified, get authorized folders from cache
    folders = await Cache.get(req.user, Cache.foldersReadableKey)
    if (!folders) {
      await Folder.userTree(req.user)
      folders = await Cache.get(req.user, Cache.foldersReadableKey)
    }
  }

  // Split search string and create array for ':*' addition in ts_query
  const contains = []
  if (search !== '') {
    let sanitize = search.replaceAll(':', ' ')
    sanitize = sanitize.replaceAll('&', ' ')
    sanitize = sanitize.replaceAll('*', ' ')
    sanitize = sanitize.replaceAll('|', ' ')

    const searchTokens = sanitize.trim().split(' ')
    for (const token of searchTokens) {
      contains.push(token + ':*')
    }
  }
  const tsquery = contains.join(' & ')

  // Search folder
  const folderList = folders.map(folders => folders)

  const items = await DB.$queryRaw`
    select i.id, i.folderid, i.type, i.title, i.metadata, i.createdat, i.updatedat, i.personal, f.description folderdescription, t.description typedescription, t.icon, t.id typeid,
      case when fav.id is not null then true else false end as favorite
    from   items i
    join   itemsfts fts
    on     fts.id = i.id
    join   folders f
    on     f.id = i.folderid
    left   join itemtypes t
    on     t.id = i.type
    left   join itemsfav fav
    on     fav.itemid = i.id
    and    fav.userid = ${req.user}
    where  i.folderid in (${Prisma.join(folderList)})
    ${tsquery && folder ? Prisma.sql` and fts.fts_vectoritem @@ to_tsquery('simple',${tsquery})` : Prisma.empty}
    ${tsquery && !folder ? Prisma.sql` and fts.fts_vectorfull @@ to_tsquery('simple',${tsquery})` : Prisma.empty}
    ${type ? Prisma.sql` and i.type=${type}::uuid` : Prisma.empty}
    ${favorite === 'true' ? Prisma.sql` and fav.id is not null ` : Prisma.empty}
    ${favorite === 'false' ? Prisma.sql` and fav.id is null ` : Prisma.empty}
    order  by
    ${tsquery && folder ? Prisma.sql` ts_rank(fts.fts_vectoritem, to_tsquery('simple',${tsquery})) ` : Prisma.empty}
    ${tsquery && !folder ? Prisma.sql` ts_rank(fts.fts_vectorfull, to_tsquery('simple',${tsquery})) ` : Prisma.empty}
    ${!tsquery ? Prisma.sql` i.title ` : Prisma.empty}
    ${folder ? Prisma.empty : Prisma.sql` limit ${limit}`}
    `

  if (items.length === 0) {
    res.status(R.NOT_FOUND).send(R.ko('No item found'))
    return
  }

  for (let i = 0; i < items.length; i++) {
    items[i].folder = { description: items[i].folderdescription }
    items[i].itemtype = { id: items[i].typeid, description: items[i].typedescription, icon: items[i].icon }

    delete items[i].typeid
    delete items[i].icon
    delete items[i].typedescription
    delete items[i].folderdescription
  }

  res.send(R.ok(items))
}

/**
 * Create an item
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
  if (!JV.validate(req.body, 'item_create')) {
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
    res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('You cannot create items in this folder'))
    return
  }

  // Check write permissions on folder
  const perm = await Folder.permissions(folder, req.user)
  if (!perm.write) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Check if personal
  let personal = false
  if (await Folder.isPersonal(folder)) {
    const check = await checkPersonalAccess(req)
    if (check !== 0) {
      res.status(check).send(R.ko('Personal folder not accessible'))
      return
    }

    personal = true
  }

  // If type is specified, check that it exists
  if (req?.body?.type) {
    const itemtype = await DB.itemtypes.findUnique({
      where: { id: req.body.type },
      select: { id: true }
    })
    if (itemtype === null) {
      res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Specified type does not exist'))
      return
    }
  }

  // Encrypt data
  let encData
  if (personal) {
    const user = await DB.users.findUnique({ where: { id: req.user }, select: { personalkey: true } })
    encData = Crypt.encryptPersonal(req.body.data, user.personalkey, req.personaltoken)
  } else {
    encData = await Item.encrypt(Const.KMS_TYPE_NODEK, req.body.data)
  }

  // Creates the item
  const newid = newId()
  await DB.items.create({
    data: {
      id: newid,
      folderid: folder,
      personal,
      title: req.body.title,
      type: req?.body?.type || null,
      algo: encData.algo,
      data: encData.encrypted,
      dataiv: encData.iv,
      dataauthtag: encData.authTag,
      metadata: req.body.metadata
    }
  })

  // Update tsvector
  await Item.updateFTS(newid)

  Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_ITEM, newid)
  res.status(R.CREATED).send(R.ok({ id: newid }))
}

/**
 * Updates an item
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function update (req, res, next) {
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
  if (!JV.validate(req.body, 'item_update')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  const itemid = req.params.id

  // Search item
  const item = await DB.items.findUnique({
    where: { id: itemid }
  })

  if (item === null) {
    res.status(R.NOT_FOUND).send(R.ko('Item not found'))
    return
  }

  const folderFromURL = req.params.folder ?? req.body.folder

  // Check write permissions on current folder
  const perm1 = await Folder.permissions(item.folderid, req.user)
  if (!perm1.write) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // If a folder is given through path or payload, check for existance and permissions
  let folderChanged = false
  if (folderFromURL) {
    if (!await Folder.exists(folderFromURL)) {
      res.status(R.NOT_FOUND).send(R.ko('Folder not found'))
      return
    }

    const perm2 = await Folder.permissions(folderFromURL, req.user)
    if (!perm2.write) {
      res.status(R.FORBIDDEN).send(R.forbidden())
      return
    }

    // Check if the folder is changing
    if (item.folderid !== folderFromURL) {
      folderChanged = true
    }
  }

  // If personal item, ensure personal password has been set and activated
  if (item.personal) {
    const check = await checkPersonalAccess(req)
    if (check !== 0) {
      res.status(check).send(R.ko('Personal folder not accessible'))
      return
    }
  }

  // If the folder is changing, check if the new folder is personal
  if (folderChanged) {
    const newFolder = await DB.folders.findUnique({
      where: { id: folderFromURL },
      select: { personal: true }
    })

    // If the new folder is personal, check if the user has access to it
    if (newFolder.personal) {
      const check = await checkPersonalAccess(req)
      if (check !== 0) {
        res.status(check).send(R.ko('Personal folder not accessible'))
        return
      }
    }
  }

  // If type is specified, check that it exists
  if (req?.body?.type) {
    const itemtype = await DB.itemtypes.findUnique({
      where: { id: req.body.type },
      select: { id: true }
    })
    if (itemtype === null) {
      res.status(R.UNPROCESSABLE_ENTITY).send(R.ko('Specified type does not exist'))
      return
    }
  }

  // Recalculate the data
  let encData
  const updateStruct = {}
  let newIsPersonal = item.personal
  if (folderFromURL) {
    // If the folder is changing, check if the new folder is personal
    newIsPersonal = await Folder.isPersonal(folderFromURL)
  }
  let newData
  if (req.body?.data) {
    newData = req.body.data
  } else {
    // If no data is given, decrypt the current data
    if (item.personal) {
      const user = await DB.users.findUnique({ where: { id: req.user }, select: { personalkey: true } })
      newData = Crypt.decryptPersonal(item.data, item.dataiv, item.dataauthtag, user.personalkey, req.personaltoken)
    } else {
      newData = Crypt.decrypt(item.data, item.dataiv, item.dataauthtag)
    }
  }

  // Encrypt according to the new folder
  if (newIsPersonal) {
    const user = await DB.users.findUnique({ where: { id: req.user }, select: { personalkey: true } })
    encData = Crypt.encryptPersonal(newData, user.personalkey, req.personaltoken)
    updateStruct.personal = true
  } else {
    encData = Crypt.encrypt(newData)
    updateStruct.personal = false
  }
  updateStruct.algo = encData.algo
  updateStruct.data = encData.encrypted
  updateStruct.dataiv = encData.iv
  updateStruct.dataauthtag = encData.authTag

  if (folderFromURL) {
    updateStruct.folderid = folderFromURL
  }

  if (req.body.title) {
    updateStruct.title = req.body.title
  }
  if (Object.hasOwn(req.body, 'metadata')) {
    updateStruct.metadata = req.body.metadata || null
  }
  if (Object.hasOwn(req.body, 'type')) {
    updateStruct.type = req.body.type || null
  }

  // Check if something has changed
  const changedFields = []
  if (updateStruct?.title && updateStruct.title !== item.title) {
    changedFields.push('title')
  }
  if (updateStruct?.type && updateStruct.type !== item.type) {
    changedFields.push('type')
  }
  if (updateStruct?.metadata && updateStruct.metadata !== item.metadata) {
    changedFields.push('metadata')
  }
  if (folderFromURL) {
    changedFields.push('folder')
  }

  // Check what has changed in data
  if (req.body?.data) {
    let decData
    if (newIsPersonal) {
      const user = await DB.users.findUnique({ where: { id: req.user }, select: { personalkey: true } })
      decData = Crypt.decryptPersonal(item.data, item.dataiv, item.dataauthtag, user.personalkey, req.personaltoken)
    } else {
      decData = Crypt.decrypt(item.data, item.dataiv, item.dataauthtag)
    }
    if (decData !== req.body.data) {
      // If JSON, check all properties for changes
      const olddata = JSON.parse(decData)
      const newdata = JSON.parse(req.body.data)
      if (olddata !== null && newdata !== null) {
        for (const key in newdata) {
          if (newdata[key] !== olddata[key]) {
            changedFields.push(key)
          }
        }
      } else {
        changedFields.push('data')
      }
    }
  }

  if (changedFields.length) {
    await DB.items.update({
      data: updateStruct,
      where: {
        id: itemid
      }
    })
    Events.add(req.user, Const.EV_ACTION_UPDATE, Const.EV_ENTITY_ITEM, itemid, null, `Updated: ${changedFields.join(',')}`)
  }

  // Update tsvector
  await Item.updateFTS(itemid)

  // Update favorite flag
  if ('favorite' in req.body) {
    await Item.setFavorite(itemid, req.user, req.body.favorite)
  }

  res.send(R.ok())
}

/**
 * Deletes an item
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function remove (req, res, next) {
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

  const itemid = req.params.id

  // Search item
  const item = await DB.items.findUnique({
    where: { id: itemid }
  })

  if (item === null) {
    res.status(R.NOT_FOUND).send(R.ko('Item not found'))
    return
  }

  // Search folder
  const folder = await DB.folders.findUnique({
    where: { id: item.folderid },
    select: { id: true }
  })

  if (folder === null) {
    res.status(R.NOT_FOUND).send(R.ko('Folder not found'))
    return
  }

  // Check write permissions on folder
  const perm = await Folder.permissions(item.folderid, req.user)
  if (!perm.write) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // If personal item, ensure personal password has been set and activated
  if (item.personal) {
    const check = await checkPersonalAccess(req)
    if (check !== 0) {
      res.status(check).send(R.ko('Personal folder not accessible'))
      return
    }
  }

  // Delete item and move it to deleted items table
  await DB.$transaction(async (tx) => {
    await DB.itemsdeleted.create({
      data: item
    })

    await DB.itemsfts.delete({
      where: {
        id: itemid
      }
    })

    await DB.itemsfav.deleteMany({
      where: {
        itemid
      }
    })

    await DB.items.delete({
      where: {
        id: itemid
      }
    })
  })

  Events.add(req.user, Const.EV_ACTION_DELETE, Const.EV_ENTITY_ITEM, itemid)
  res.send(R.ok())
}

/**
 * Clone an item
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function clone (req, res, next) {
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

  const itemid = req.params.id

  // Search item
  const item = await DB.items.findUnique({
    where: { id: itemid }
  })

  if (item === null) {
    res.status(R.NOT_FOUND).send(R.ko('Item not found'))
    return
  }

  // Check write permissions on folder
  const perm = await Folder.permissions(item.folderid, req.user)
  if (!perm.write) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // If personal item, ensure personal password has been set and activated
  if (item.personal) {
    const check = await checkPersonalAccess(req)
    if (check !== 0) {
      res.status(check).send(R.ko('Personal folder not accessible'))
      return
    }
  }

  // Reencrypt data
  let oldData
  if (item.personal) {
    const user = await DB.users.findUnique({ where: { id: req.user }, select: { personalkey: true } })
    oldData = Crypt.decryptPersonal(item.data, item.dataiv, item.dataauthtag, user.personalkey, req.personaltoken)
  } else {
    oldData = Item.decrypt(item.data, item.dataiv, item.dataauthtag)
  }
  const newData = Crypt.encrypt(oldData)

  // Creates the item
  const newid = newId()
  const newItem = {
    id: newid,
    folderid: item.folderid,
    title: `${item.title} - Copy`,
    type: item.type,
    algo: newData.algo,
    data: newData.encrypted,
    dataiv: newData.iv,
    dataauthtag: newData.authTag,
    metadata: item.metadata
  }

  await DB.items.create({
    data: newItem
  })

  // Update tsvector
  await Item.updateFTS(newid)

  Events.add(req.user, Const.EV_ACTION_CLONE, Const.EV_ENTITY_ITEM, itemid)
  Events.add(req.user, Const.EV_ACTION_CREATE, Const.EV_ENTITY_ITEM, newid)
  res.status(R.CREATED).send(R.ok({ id: newid }))
}

/**
 * Get item activity
 * @param {Object} req Request
 * @param {Object} res Response
 * @param {Object} next Next
 */
export async function activity (req, res, next) {
  const act = await Events.activity(req.query?.lastid, null, req.params.id, req.query?.sort)
  res.send(R.ok(act))
}
