/**
 * Item object module
 * @module model/item
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as Folder from './folder.mjs'
import * as Const from '../lib/const.mjs'
import DB from '../lib/db.mjs'

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
