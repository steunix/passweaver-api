/**
 * Random module
 * @module src/random
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { ulid } from 'ulid'

/**
 * Returns unique random string
 * @returns {string} Random string
 */
export function randomId() {
  return ulid()
}
