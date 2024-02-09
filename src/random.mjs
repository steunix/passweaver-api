/**
 * Random module
 * @module src/random
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { uuidv7obj } from 'uuidv7'
import { CrockfordBase32 } from 'crockford-base32'

/**
 * Returns unique random string
 * @returns {string} Random string
 */
export function randomId() {
  const rand = uuidv7obj().bytes
  const enc = CrockfordBase32.encode(Buffer.from(rand))
  return enc
}
