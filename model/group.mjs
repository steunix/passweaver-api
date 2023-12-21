/**
 * Group object module
 * @module model/group
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaClient } from '@prisma/client'
import * as Cache from '../src/cache.mjs'
import * as Config from '../src/config.mjs'

const prisma = new PrismaClient(Config.get().prisma_options)

/**
 * Returns true if group exists
 * @param {string} id Group ID
 * @returns
 */
export async function exists(id) {
  try {
    const group = await prisma.groups.findUniqueOrThrow({
      where: { id: id}
    })
    return true
  } catch ( exc ) {
    return false
  }
}

// Gets group parents, ordered by closest first
export async function parents(id, includeSelf) {
  let array = [];

  if ( id=="0" ) {
    return array
  }

  let group = await prisma.groups.findUnique({
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
      group = await prisma.groups.findUnique({
        where: {id:parentid}
      })
      group.tree_level = level++
      array.push(group)

      if ( group.id=="0" ) {
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
 * @param {string} id group id
 * @returns
 */
export async function children(id) {
  let ret = []

  const groups = await prisma.groups.findMany()

  // Recursive to get all children
  function addChildren(id) {
    let items = groups.filter(elem => elem.parent == id)
    for ( const child of items ) {
      if ( child.id!="0" ) {
        ret.push(child)
        addChildren(child.id)
      }
    }
  }

  addChildren(id)

  return ret
}

// Returns the parent of a group
export async function parent(id) {
  const res = await this.parents(id,false)

  if ( res.length==0 ) {
    return []
  }

  return res[0]
}

/**
 * Return the tree structure of groups visible to the user
 * @param {string} user
 */
export async function tree(user) {
  const c = Cache.get("vaulted.groups."+user)
  if ( c ) {
    return c
  }

  // Get groups
  const data = await prisma.groups.findMany()

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

  Cache.set("vaulted.groups."+user, tree)
  return tree
}