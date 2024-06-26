/**
 * User object module
 * @module model/user
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import DB from '../lib/db.mjs'


/**
 * Returns true if the user exists
 * @param {string} id User
 * @returns {boolean} True if the user exists
 */
export async function exists(id) {
  try {
    const folder = await DB.users.findUniqueOrThrow({
      where: { id: id}
    })
    return true
  } catch ( exc ) {
    return false
  }
}

/**
 * Returns groups for a user
 * @param {string} user User
 * @returns {Array} Array of groups
 */
export async function groups(user) {
  const groups = await DB.groupsmembers.findMany({
    where: { userid: user },
    include: {
      groups: {}
    }
  })

  let array = []
  for ( const rec of groups ) {
    array.push(rec.groups)
  }
  return array
}

