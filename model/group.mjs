/**
 * Group object module
 * @module model/group
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import * as Cache from '../lib/cache.mjs'
import * as Const from '../lib/const.mjs'
import DB from '../lib/db.mjs'

/**
 * Returns true if group exists
 * @param {string} id Group ID
 * @returns
 */
export async function exists(id) {
  try {
    const group = await DB.groups.findUniqueOrThrow({
      where: { id: id}
    })
    return true
  } catch ( exc ) {
    return false
  }
}

/**
 *
 * @param {string} id Folder
 * @param {boolean} includeSelf If true, passed folder is returned in the array
 * @returns
 */
export async function parents(id, includeSelf) {
  let array = [];

  if ( id==Const.PW_GROUP_ROOTID ) {
    return array
  }

  let group = await DB.groups.findUnique({
    where: {id:id}
  })

  // Adds itself if requested
  if ( includeSelf ) {
    group.tree_level = 0
    array.push(group)
  }

  let parentid = group.parent
  let search = true;
  let level = 1;


  // Search parents
  while ( search ) {
    try {
      group = await DB.groups.findUnique({
        where: {id:parentid}
      })
      group.tree_level = level++
      array.push(group)

      if ( group.id==Const.PW_GROUP_ROOTID ) {
        search = false;
      }
    } catch ( exc ) {
      search = false
    }
    parentid = group.parent
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
 * Gets all children for a given group
 *
 * @param {string} id Group id
 * @returns
 */
export async function children(id) {
  let ret = []

  const groups = await DB.groups.findMany({
    orderBy: {
      description: "asc"
    }
  })

  // Recursive to get all children
  function addChildren(id) {
    let items = groups.filter(elem => elem.parent == id)
    for ( const child of items ) {
      if ( child.id!=Const.PW_GROUP_ROOTID ) {
        ret.push(child)
        addChildren(child.id)
      }
    }
  }

  addChildren(id)

  return ret
}

/**
 * Returns an array containing the parents of a folder
 * @param {id} id Folder ID
 * @returns {Array} Folders array
 */
export async function parent(id) {
  const res = await this.parents(id,false)

  if ( res.length==0 ) {
    return []
  }

  return res[0]
}

/**
 * Return the tree structure of groups visible to the user
 * @param {string} user User
 * @returns {Object} Folders tree
 */
export async function tree(user) {
  const cache = await Cache.get(user, Cache.groupsTreeKey)
  if ( cache ) {
    return cache
  }

  // Get groups
  const data = await DB.groups.findMany({
    orderBy: {
      description: "asc"
    }
  })

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

  await Cache.set(user, Cache.groupsTreeKey, tree)
  return tree
}