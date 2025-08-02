/**
 * API key module
 * @module model/apikey
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import DB from '../lib/db.mjs'
import * as KMS from '../lib/kms/kms.mjs'
import isInSubnet from 'is-in-subnet'
import isCIDR from 'is-cidr'

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

/**
 * Validate string as a valid list of CIDR ranges
 * @param {string} cidrlist Comma-separated list of IPs or CIDR ranges
 * @returns {boolean} True if valid, false otherwise
 */
export function validateCIDRList (cidrlist) {
  if (!cidrlist) return true // Empty list is valid

  const cidrs = cidrlist.split(',')
  for (const cidr of cidrs) {
    const tcdr = cidr.trim()
    if (!isCIDR(tcdr)) {
      return false
    }
  }
  return true
}

/**
 * Check if IP is contained in the whitelist of CIDR ranges
 * @param {string} cidrlist Comma-separated list of CIDR ranges
 * @param {string} ip IP address to check
 * @returns {boolean} True if IP is whitelisted, false otherwise
 */
export function checkIPWhitelist (cidrlist, ip) {
  if (!cidrlist) return true

  const cidrs = cidrlist.split(',')
  return isInSubnet.isInSubnet(ip, cidrs)
}
