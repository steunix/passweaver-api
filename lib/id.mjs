/**
 * IDs module
 * @module lib/id
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import { uuidv7obj } from 'uuidv7'
import { CrockfordBase32 } from 'crockford-base32'

/**
 * Returns a new unique ID string, based on uuidv7
 * @returns {string} New ID
 */
export function newId () {
  const rand = uuidv7obj().bytes
  const enc = CrockfordBase32.encode(Buffer.from(rand))
  return enc
}
