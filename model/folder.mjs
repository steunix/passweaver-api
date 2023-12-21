/**
 * Folder object module
 * @module model/folder
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaClient } from '@prisma/client'
import * as User from './user.mjs'
import * as Cache from '../src/cache.mjs'
import * as Config from '../src/config.mjs'
import * as Auth from '../src/auth.mjs'

const prisma = new PrismaClient(Config.get().prisma_options)

/**
 * Returns true if the folder exists
 * @param {string} id
 * @returns
 */
export async function exists(id) {
  try {
    const folder = await prisma.folders.findUniqueOrThrow({
      where: { id: id}
    })
    return true
  } catch ( exc ) {
    return false
  }
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

  const folders = foldersRecordset || await prisma.folders.findMany()

  const item = folders.find(elem => elem.id == id)

  // Adds itself if requested
  if ( includeSelf ) {
    item.tree_level = 0
    array.push(item)
  }

  // If root, don't look any further
  if ( id=="0") {
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

      if ( folder.id=="0" ) {
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

  const folders = foldersRecordset || await prisma.folders.findMany()

  // Recursive to get all children
  async function addChildren(id) {
    let items = folders.filter(elem => elem.parent == id)
    for ( const child of items ) {
      if ( child.id!="0" ) {
        ret.push(child)
        await addChildren(child.id)
      }
    }
  }

  await addChildren(id)

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
    const admin = Auth.isAdmin(user)
    if ( admin || folders[0].user == id ) {
      perm.read = true
      perm.write = true
    }
    return perm
  }

  let groups = await User.groups(user)

  // Scans all parent folders and OR's all the found permissions
  for ( const folder of folders ) {
    for ( const group of groups ) {
      const prm = await prisma.FolderGroupPermission.findMany({
        where: { folder: folder.id, group: group.id }
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
 * @param {string} user
 */
export async function tree(user) {
  const c = Cache.get("vaulted.tree."+user)
  if ( c ) {
    return c
  }

  // Get folders
  const folders = await prisma.folders.findMany()

  let data = []

  // Removes all folders that are not visible:
  // 1. For each folder, children are looped
  // 2. If the children have permission to read, they must be readable, along with all of the fathers in order:
  //    - to be represented correctly in a tree view, for example
  //    - to retain the original structure, otherwise it would be a false representation
  const cache = []
  for (const record of folders) {
    const items = await children(record.id, folders)

    let perm = {}
    for ( const child of items ) {
      if ( cache[child.id] === undefined ) {
        perm = await permissions(child.id, user, folders)
        cache[child.id] = perm
      } else {
        perm = cache[child.id]
      }

      // If children has 'read', all parents must has 'read'
      if ( perm.read ) {
        const prnts = await parents(child.id, true, folders)
        for ( const p of prnts ) {
          if ( !data.find( (elem) => elem.id == p.id) ) {
            data.push(p)
          }
        }
      }
    }
  }

  // Builds tree from flat data
  const tree = []
  const hashTable = Object.create(null);
  data.forEach(d => hashTable[d.id] = {...d, children: []});
  data.forEach(d => {
    if(d.parent) {
      hashTable[d.parent].children.push(hashTable[d.id])
    } else {
      tree.push(hashTable[d.id])
    }
  })

  Cache.set("vaulted.tree."+user, tree)
  return tree
}