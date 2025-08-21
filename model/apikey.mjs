/**
 * API key module
 * @module model/apikey
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import DB from '../lib/db.mjs'
import * as KMS from '../lib/kms/kms.mjs'
import isInSubnet from 'is-in-subnet'
import isCIDR from 'is-cidr'
import dateFormat from 'dateformat'

/**
 * Search API key
 * @param {String} description Description to filter
 * @param {String} userid User ID to filter
 * @returns
 */
export async function search (description, userid) {
  const where = {}
  if (description) {
    where.description = { contains: description, mode: 'insensitive' }
  }
  if (userid) {
    where.userid = { equals: userid }
  }

  const apik = await DB.apikeys.findMany({
    where,
    orderBy: {
      description: 'asc'
    }
  })

  return apik
}

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

/**
 * Validate time whitelist format
 * @param {string} timeWhitelist Comma-separated list of time ranges in DOW:HHMM-HHMM, where DOW is day of week (MON-SUN or ANY) and HHMM is hour (24h format) and minute (initial and final)
 */
export function validateTimeWhitelist (timeWhitelist) {
  if (!timeWhitelist) return true // Empty list is valid

  const ranges = timeWhitelist.split(',')
  for (const range of ranges) {
    const [dow, time] = range.trim().split(':')
    if (!['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'ANY'].includes(dow)) {
      return false
    }
    if (!/^\d{4}-\d{4}$/.test(time)) {
      return false
    }
  }
  return true
}

/**
 * Check if the IP is whitelisted based on the time whitelist and current time
 * @param {string} timeWhitelist Comma-separated list of time ranges in DOW:HH:MM
 * @param {Date} date Date to check
 * @returns {boolean} True if IP is whitelisted, false otherwise
 */
export function checkTimeWhitelist (timeWhitelist, date) {
  if (!timeWhitelist) return true

  const refDate = date || new Date()
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const currentDay = refDate.getDay()
  const currentTime = dateFormat(refDate, 'HHMM')

  const ranges = timeWhitelist.split(',')
  for (const range of ranges) {
    const [rangeDow, rangeTime] = range.trim().split(':')
    const [startTime, endTime] = rangeTime.split('-')
    if ((rangeDow === 'ANY' || rangeDow === days[currentDay]) &&
        (currentTime >= startTime && currentTime <= endTime)) {
      return true
    }
  }
  return false
}
