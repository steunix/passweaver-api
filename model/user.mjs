/**
 * User object module
 * @module model/user
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaClient } from '@prisma/client'
import * as Config from '../src/config.mjs'

const prisma = new PrismaClient(Config.get().prisma_options)

/**
 * Returns true if the user exists
 * @param {string} id
 * @returns
 */
export async function exists(id) {
  try {
    const folder = await prisma.users.findUniqueOrThrow({
      where: { id: id}
    })
    return true
  } catch ( exc ) {
    return false
  }
}

// Returns the groups of a user
export async function groups(user) {
  const groups = await prisma.usersGroups.findMany({
    where: { user: user },
    include: {
      relGroups: {}
    }
  })

  let array = []
  for ( const rec of groups ) {
    array.push(rec.relGroups)
  }
  return array
}

