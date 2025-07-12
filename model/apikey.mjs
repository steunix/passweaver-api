/**
 * API key module
 * @module model/apikey
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import DB from '../lib/db.mjs'
import * as KMS from '../lib/kms/kms.mjs'

/**
 * Check if API key exists
 * @param {*} apikey API key id
 * @returns {boolean} Returns true if API key exists, otherwise false
 */
export async function exists (apikey) {
  const apik = await DB.apikeys.findUnique({
    where: { id: apikey },
    select: { id: true }
  })

  return apik !== null
}

/**
 * Check if secret match
 * @param {string} apikey API key id
 * @param {string} secret Secret
 * @returns {boolean} Returns if secret matches the API key secret
 */
export async function checkSecret (apikey, secret) {
  const apik = await DB.apikeys.findUnique({
    where: { id: apikey }
  })

  if (apik === null) {
    return false
  }

  const dec = await KMS.decrypt(apik.kmsid, apik.dek, apik.secret, apik.secretiv, apik.secretauthtag, apik.algorithm)
  return (dec === secret)
}
