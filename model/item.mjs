/**
 * Item object module
 * @module model/item
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as Folder from './folder.mjs'
import * as Const from '../lib/const.mjs'
import DB from '../lib/db.mjs'
import * as Crypt from '../lib/crypt.mjs'
import * as KMS from '../lib/kms/kms.mjs'

/**
 * Update ts_vector fields for full text search
 * @param {string} id Item ID
 * @returns
 */
export async function updateFTS (id) {
  const item = await DB.items.findUnique({
    where: { id }
  })

  const pfolders = await Folder.parents(item.folderid)
  let ftsf = ''
  for (const f of pfolders) {
    if (f.id !== Const.PW_FOLDER_ROOTID && f.id !== Const.PW_FOLDER_PERSONALROOTID) {
      ftsf += f.description + ' '
    }
  }
  ftsf += item.title + ' ' + (item.metadata || '')
  const ftsi = item.title + ' ' + (item.metadata || '')

  await DB.$queryRaw`
    insert into itemsfts (id,fts_vectorfull,fts_vectoritem)
    values ( ${id}, to_tsvector('simple',${ftsf}), to_tsvector('simple',${ftsi}) )
    on     conflict(id) do
    update set fts_vectorfull = to_tsvector('simple',${ftsf}),
      fts_vectoritem = to_tsvector('simple',${ftsi})`
}

/**
 * Decrypt user data
 * @param {string} itemid Item ID
 * @param {object} req Express request
 * @returns {string} Decrypted data
 */
export async function decrypt (itemid, req) {
  // Search item
  const item = await DB.items.findUniqueOrThrow({
    where: { id: itemid },
    select: {
      data: true,
      dataiv: true,
      dataauthtag: true,
      algo: true,
      personal: true,
      kmsid: true,
      dek: true
    }
  })

  let data
  if (item.personal) {
    const user = await DB.users.findUnique({ where: { id: req.user }, select: { personalkey: true } })
    data = Crypt.decryptPersonal(item.data, item.dataiv, item.dataauthtag, user.personalkey, req.personaltoken)
  } else {
    data = await KMS.decrypt(item.kmsid, item.dek, item.data, item.dataiv, item.dataauthtag, item.algo)
  }

  return data
}

/**
 * Encrypt data using given KMS
 * @param {Number} kmsmode KMS mode
 * @param {String} data Data to encrypt
 * @returns A structure containing the IV, the encrypted data and the auth tag, along other informations.
 */
export async function encrypt (data) {
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
    await DB.itemsfav.create({
      data: { itemid, userid }
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
