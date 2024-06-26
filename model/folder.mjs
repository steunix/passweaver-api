/**
 * Folder object module
 * @module model/folder
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import * as User from './user.mjs'
import * as Cache from '../lib/cache.mjs'
import * as Auth from '../lib/auth.mjs'
import * as Const from '../lib/const.mjs'
import DB from '../lib/db.mjs'

/**
 * Returns true if the folder exists
 * @param {string} id Folder ID
 * @returns
 */
export async function exists(id) {
  try {
    const folder = await DB.folders.findUniqueOrThrow({
      where: { id: id}
    })
    return true
  } catch ( exc ) {
    return false
  }
}

/**
 * Returns true if the folder is personal
 * @param {string} id Folder ID
 */
export async function isPersonal(id) {
  const folders = await parents(id, true)

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
 * @param {*} includeSelf Include itself in the array
 * @param {array} foldersRecordset If provided, it's used instead of doing a query
 * @returns Array
 */
export async function parents(id, includeSelf, foldersRecordset) {
  let array = [];

  const folders = foldersRecordset ?? await DB.folders.findMany({
    orderBy: {
      description: "asc"
    }
  })

  const item = folders.find(elem => elem.id == id)

  // Adds itself if requested
  if ( includeSelf ) {
    item.tree_level = 0
    array.push(item)
  }

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

  const folders = foldersRecordset ?? await DB.folders.findMany({
    orderBy: {
      description: "asc"
    }
  })

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
 * Returns the parent of a folder
 * @param {string} id Folder id
 * @returns
 */
export async function parent(id) {
  const res = await this.parents(id,false)

  if ( res.length==0 ) {
    return []
  }

  return res[0]
}

/**
 * Gets the permissions for a user on a folder
 *
 * Permissions are always inherited: the given folder's permission are OR'ed with parents,
 * so that if a user has read or write on a folder it has it on all the children
 * @param {string} id Folder id
 * @param {string} user User id
 * @param {array} foldersRecordset If provided, it's used instead of doing a query
*/
export async function permissions(id,user,foldersRecordset) {
  let perm = {
    read: false,
    write: false
  }

  let folders = await parents(id,true,foldersRecordset)

  // First folder is itself, so I can check if it's personal
  if ( folders[0].personal ) {
    const admin = await Auth.isAdmin(user)
    if ( admin || folders[0].userid == user ) {
      perm.read = true
      perm.write = true
    }
    return perm
  }

  let groups = await User.groups(user)

  // Scans all parent folders and OR's all the found permissions
  for ( const folder of folders ) {
    for ( const group of groups ) {
      const prm = await DB.folderspermissions.findMany({
        where: { folderid: folder.id, groupid: group.id }
      })

      for ( const p of prm ) {
        perm.read = perm.read || p.read
        perm.write = perm.write || p.write

        // If both perm are true, we can early exit
        if ( perm.read && perm.write ) {
          return perm
        }
      }
    }
  }

  return perm
}

/**
 * Return the tree structure of folders visible to the user.
 *
 * @param {string} user User
 */
export async function tree(user) {
  const c = Cache.get(user, Cache.foldersTreeKey)
  if ( c ) {
    return c
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
    const aparents  = await parents(folder.id, true, allFolders)

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

  Cache.set(user, Cache.foldersTreeKey, tree)
  Cache.set(user, Cache.foldersReadableKey, Array.from(readable.keys()))
  return tree
}
