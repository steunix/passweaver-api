/**
 * Random module
 * @module src/random
 */

import { ulid } from 'ulid'

/**
 * Returns unique random string
 * @returns {string} Random string
 */
export function randomId() {
  return ulid()
}
