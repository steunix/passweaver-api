/**
 * Item object module
 * @module model/item
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import * as Folder from './folder.mjs'
import * as Const from '../lib/const.mjs'
import DB from '../lib/db.mjs'

/**
 * Updates ts_vector fields for full text search
 * @param {string} id Item ID
 * @returns
 */
export async function update_fts(id) {
  // Update tsvector
  const item = await DB.items.findUnique({
    where: { id: id}
  })

  const pfolders = await Folder.parents(item.folderid)
  var ftsf = ''
  for ( const f of pfolders ) {
    if ( f.id!=Const.PW_FOLDER_ROOTID && f.id!=Const.PW_FOLDER_PERSONALROOTID ) {
      ftsf += f.description + ' '
    }
  }
  ftsf += item.title + ' ' + item.metadata
  const ftsi = item.title + ' ' + item.metadata

  await DB.$queryRaw`
    update items
    set    fts_vectorfull = to_tsvector('simple',${ftsf}), fts_vectoritem = to_tsvector('simple',${ftsi})
    where  id = ${id}`
}

