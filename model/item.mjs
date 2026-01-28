/**
 * Item object module
 * @module model/item
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as Folder from './folder.mjs'
import * as Const from '../lib/const.mjs'
import DB from '../lib/db.mjs'
import * as Crypt from '../lib/crypt.mjs'
import * as crypto from 'crypto'
import * as KMS from '../lib/kms/kms.mjs'

/**
 * Update ts_vector fields for full text search
 * @param {string} id Item ID
 * @returns
 */
export async function updateFTS (id) {
  const idlist = [id]

  const item = await DB.items.findUnique({
    where: { id }
  })

  // Get all linked items
  const linkedItems = await DB.items.findMany({
    where: { linkeditemid: item.id }
  })
  linkedItems.forEach(li => idlist.push(li.id))

  const pfolders = await Folder.parents(item.folderid)
  let ftsf = ''
  for (const f of pfolders) {
    if (f.id !== Const.PW_FOLDER_ROOTID && f.id !== Const.PW_FOLDER_PERSONALROOTID) {
      ftsf += f.description + ' '
    }
  }
  ftsf += item.title + ' ' + (item.metadata || '')
  const ftsi = item.title + ' ' + (item.metadata || '')

  await DB.$transaction(async () => {
    for (const itmid of idlist) {
      await DB.$queryRaw`
        insert into itemsfts (id,fts_vectorfull,fts_vectoritem)
        values ( ${itmid}, to_tsvector('simple',${ftsf}), to_tsvector('simple',${ftsi}) )
        on     conflict(id) do
        update set fts_vectorfull = to_tsvector('simple',${ftsf}),
          fts_vectoritem = to_tsvector('simple',${ftsi})`
    }
  })
}

/**
 * Decrypt user data
 * @param {Object} item Item db record
 * @param {Object} req Express request
 * @returns {string} Decrypted data, base64 encoded
 */
export async function decrypt (item, req) {
  let data
  data = await KMS.decrypt(item.kmsid, item.dek, item.data, item.dataiv, item.dataauthtag, item.algo)

  // If item is personal, decrypt with personal key
  if (item.personal) {
    const user = await DB.users.findUnique({ where: { id: req.user }, select: { personalkey: true } })
    const pkey = Crypt.decryptPersonalKey(user.personalkey, req.personaltoken)

    // Decrypt with personal key
    const decipher = crypto.createDecipheriv('aes-256-ecb', pkey, '')

    let decrypted = decipher.update(data, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    data = decrypted
  }

  return data
}

/**
 * Encrypt data using given KMS
 * @param {Number} kmsmode KMS mode
 * @param {String} data Data to encrypt
 * @param {String} user If a user is given, it is encrypted as a personal item
 * @param {String} personaltoken User's personal token
 * @returns A structure containing the IV, the encrypted data and the auth tag, along other informations.
 */
export async function encrypt (data, user, personaltoken) {
  if (user !== undefined) {
    const usr = await DB.users.findUnique({ where: { id: user }, select: { personalkey: true } })
    const pkey = Crypt.decryptPersonalKey(usr.personalkey, personaltoken)

    // Encrypt with AES-256-ECB, it does not require IV
    const cipher = crypto.createCipheriv('aes-256-ecb', pkey, '')

    let encrypted = cipher.update(data, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    data = encrypted
  }
  return await KMS.encrypt(data, 'aes-256-gcm')
}

/**
 * Set favorite item for user
 * @param {string} itemid Item ID
 * @param {string} userid User ID
 * @param {boolean} favorite Boolean value for favorite
 */
export async function setFavorite (itemid, userid, favorite) {
  await DB.itemsfav.deleteMany({
    where: { itemid, userid }
  })

  if (favorite) {
    await DB.itemsfav.createMany({
      data: [{ itemid, userid }]
    })
  }

  return true
}

/**
 * Return favorite flag for item and user
 * @param {string} itemid Item ID
 * @param {string} userid User ID
 * @return {boolean} Favorite flag
 */
export async function isFavorite (itemid, userid) {
  const item = await DB.itemsfav.findFirst({
    where: { itemid, userid }
  })

  return !!item
}

/**
 * Synchronize linked items with the original one
 * @param {string} itemid Item ID
 * @param {number} itemtypeid Item type ID
 * @param {string} title Item title
 */
export async function syncLinkedItems (itemid, itemtypeid, title) {
  const linkedItems = await DB.items.findMany({
    where: { linkeditemid: itemid },
    select: { id: true }
  })

  await DB.$transaction(async () => {
    for (const li of linkedItems) {
      if (itemtypeid) {
        await DB.items.update({
          where: { id: li.id },
          data: { type: itemtypeid }
        })
      }
      if (title) {
        await DB.items.update({
          where: { id: li.id },
          data: { title }
        })
      }
    }
  })
}
