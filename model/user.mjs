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
export async function exists (id) {
  const user = await DB.users.findUnique({
    where: { id },
    select: { id: true }
  })
  return (user !== null)
}

/**
 * Returns groups for a user
 * @param {string} user User
 * @returns {Array} Array of groups
 */
export async function groups (user) {
  const groups = await DB.groupsmembers.findMany({
    where: { userid: user },
    include: {
      groups: {}
    }
  })

  const array = []
  for (const rec of groups) {
    array.push(rec.groups)
  }
  return array
}
