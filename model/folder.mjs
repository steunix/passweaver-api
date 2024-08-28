/**
 * Folder object module
 * @module model/folder
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import * as Cache from '../lib/cache.mjs'
import * as Item from './item.mjs'
import * as Const from '../lib/const.mjs'
import DB from '../lib/db.mjs'

/**
 * Returns true if the folder exists
 * @param {string} id Folder ID
 * @returns
 */
export async function exists(id) {
  const folder = await DB.folders.findUnique({
    where: { id: id },
    select: { id: true }
  })
  return ( folder !== null )
}

/**
 * Returns true if the folder is personal
 * @param {string} id Folder ID
 */
export async function isPersonal(id) {
  const folders = await parents(id)

  for ( const folder of folders ) {
    if ( folder.id==Const.PW_FOLDER_PERSONALROOTID ) {
      return true
    }
  }

  return false
}

/**
 * Returns the parents of a folder, ordered from last child to root
 * @param {*} id Folder id
 * @param {array} foldersRecordset If provided, it's used instead of doing a query
 * @returns Array
 */
export async function parents(id, foldersRecordset) {
  let array = [];

  // If no recordset is provided, query the DB
  if ( !foldersRecordset ) {
    const pFolders = await DB.$queryRaw`
      with recursive folder_parents as
      (
        select 1 as level, *
        from   folders ffolder
        where  ffolder.id=${id}
        union all
        select fchild.level+1 as level, fparent.*
        from   folders fparent
        join   folder_parents fchild
        on     fparent.id = fchild.parent
      )
      select * from folder_parents
      order by level, description
    `
    return pFolders
  }

  const folders = foldersRecordset

  const item = folders.find(elem => elem.id == id)

  // Adds itself as root
  item.tree_level = 0
  array.push(item)

  // If root, don't look any further
  if ( id==Const.PW_FOLDER_ROOTID ) {
    return array
  }

  let parentid = item.parent
  let search = true;
  let level = 1;
  let folder

  // Search parents
  while ( search ) {
    try {
      folder = folders.find(elem => elem.id == parentid)

      folder.tree_level = level++
      array.push(folder)

      if ( folder.id==Const.PW_FOLDER_ROOTID ) {
        search = false;
      }
    } catch ( exc ) {
      search = false
    }
    parentid = folder.parent
  }

  // Sort by tree_level
  array.sort((a,b)=>{
    if ( a.tree_level < b.tree_level) {
      return -1
    }
    if ( a.tree_level > b.tree_level) {
      return 1
    }
    return 0
  })
  return array;
}

/**
 * Gets all children for a given folder
 *
 * @param {string} id Folder id
 * @param {array} foldersRecordset If provided, it's used instead of doing a query
 * @returns
 */
export async function children(id, foldersRecordset) {
  let ret = []

  if ( !foldersRecordset ) {
    const pFolders = await DB.$queryRaw`
      with recursive folder_tree as
      (
        select 1 as level, *
        from   folders froot
        where  froot.id=${id}
        union all
        select fparent.level+1 as level, fchild.*
        from   folders fchild
        join   folder_tree fparent
        on     fchild.parent = fparent.id
      )
      select * from folder_tree
      where  id!=${id}
      order  by level, parent, description`
    return pFolders
  }

  const folders = foldersRecordset

  // Recursive to get all children
  function addChildren(id) {
    let items = folders.filter(elem => elem.parent == id)
    for ( const child of items ) {
      if ( child.id!=Const.PW_FOLDER_ROOTID ) {
        ret.push(child)
        addChildren(child.id)
      }
    }
  }

  addChildren(id)

  return ret
}

/**
 * Gets the permissions for a user on a folder
 *
 * Permissions are always inherited: the given folder's permission are OR'ed with parents,
 * so that if a user has read or write on a folder it has it on all the children
 * @param {string} id Folder id
 * @param {string} user User id
*/
export async function permissions(id,user) {
  let ret = {
    read: false,
    write: false
  }

  // Extracts the parents, and all the permissions for any group where user is a member
  const pPerms = await DB.$queryRaw`
    with recursive folder_parents as
    (
      select 1 as level, *
      from   folders ffolder
      where  ffolder.id=${id}
      union all
      select fchild.level+1 as level, fparent.*
      from   folders fparent
      join   folder_parents fchild
      on     fparent.id = fchild.parent
    )
    select f.personal, f.userid, p.read, p.write
    from   folder_parents f
    join   folderspermissions p
    on     p.folderid = f.id
    join   groupsmembers m
    on     p.groupid = m.groupid
    where  m.userid = ${user}
    order  by level`

  // No perms?
  if ( pPerms.length==0 ) {
    // The above query does not find personal folders, for which there is no explicit permission
    const folder = await DB.folders.findUnique({
      where: { id: id }
    })
    if ( folder.personal && folder.userid==user ) {
      ret.read = true
      ret.write = true
    }
    return ret
  }

  for ( const perm of pPerms ) {
    ret.read = ret.read || perm.read
    ret.write = ret.write || perm.write

    // If both perm are true, we can early exit
    if ( ret.read && ret.write ) {
      return ret
    }
  }

  return ret
}

/**
 * Return the tree structure of folders visible to the user.
 *
 * @param {string} user User
 */
export async function tree(user) {
  const cache = await Cache.get(user, Cache.foldersTreeKey)
  if ( cache ) {
    return cache
  }

  // Get folders for cache
  const allFolders = await DB.folders.findMany()

  // Explicitly allowed folders, plus personal folder
  const readFolders = await DB.$queryRaw`
    select f.*
    from   folders f
    join   folderspermissions p
    on     f.id = p.folderid
    join   groups g
    on     g.id = p.groupid
    join   groupsmembers ug
    on     ug.groupid = g.id
    where  p.read = true
    and    ug.userid = ${user}
    union
    select pf.*
    from   folders pf
    where  pf.personal = true
    and    pf.userid = ${user}`

  // For each allowed folder, add all parents and children
  var readable = new Map()
  var data = []
  var added = new Map()
  for ( const folder of readFolders ) {

    const achildren = await children(folder.id, allFolders)
    const aparents  = await parents(folder.id, allFolders)

    readable.set(folder.id, folder.id)

    // Each children is also added to read-permitted folders for caching
    for ( const el of achildren ) {
      // Only 'admin' user can see all personal folders
      if ( el.personal==true && el.user!=user && user!='0' ) {
        continue
      }

      if ( !added.get(el.id) ) {
        data.push(el)
        added.set(el.id,el.id)

        readable.set(el.id, el.id)
      }
    }
    for ( const el of aparents ) {
      if ( !added.get(el.id) ) {
        data.push(el)
        added.set(el.id,el.id)
      }
    }
  }

  // Sort by description
  data.sort( (a,b)=>{
    if ( a.id==Const.PW_FOLDER_PERSONALROOTID && b.id!=Const.PW_FOLDER_ROOTID ) { return -1 }
    if ( b.id==Const.PW_FOLDER_PERSONALROOTID && a.id!=Const.PW_FOLDER_ROOTID ) { return 1 }
    if ( a.description<b.description ) { return -1 }
    if ( a.description>b.description ) { return 1 }
    return 0
  })

  // Builds tree from array
  const hashTable = Object.create(null)
  data.forEach(d => hashTable[d.id] = {...d, children: []})

  const tree = []
  data.forEach(d => {
    if(d.parent) {
      hashTable[d.parent].children.push(hashTable[d.id])
    } else {
      tree.push(hashTable[d.id])
    }
  })

  await Cache.set(user, Cache.foldersTreeKey, tree)
  await Cache.set(user, Cache.foldersReadableKey, Array.from(readable.keys()))
  return tree
}

/**
 * Updates ts_vector for folder and its children
 * @param {} id
 */
export async function update_fts(id) {
  const cfolders = await children(id)
  cfolders.push(id)

  for ( const f of cfolders ) {
    const items = await DB.items.findMany({
      where: { folderid: f },
      select: { id: true }
    })

    for ( const i of items ) {
      await Item.update_fts(i.id)
    }
  }
}