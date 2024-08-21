/**
 * Cache module
 * @module lib/cache
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import * as Config from './config.mjs'
import * as CacheNode from './cache/cache-node.mjs'
import * as CacheRedis from './cache/cache-redis.mjs'

var Cache

const prefix = "pwapi"
export const foldersTreeKey = "ft"
export const foldersReadableKey = "fr"
export const groupsTreeKey = "gt"

console.log("Initializing cache...")

/**
 * Initialize cache reading config
 */
export async function init() {
  const config = Config.get()
  if ( config.redis.enabled ) {
    Cache = CacheRedis
    await Cache.init(
      config.redis.url
    )
  } else {
    Cache = CacheNode
    Cache.init()
  }
}

/**
 * Resets folders tree cache
 * @param {string} user If provided, only cache for this user will be reset
 */
export async function resetFoldersTree(user) {
  var k = `${prefix}:${foldersTreeKey}`
  if ( user ) {
    k += `.${user}`
  }
  await Cache.del(k)

  k = `${prefix}:${foldersReadableKey}`
  if ( user ) {
    k += `.${user}`
  }
  await Cache.del(k)
}

/**
 * Reset groups tree cache
 */
export async function resetGroupsTree() {
  const k = `${prefix}:${groupsTreeKey}`
  await Cache.del(k)
}

/**
 * Gets a user key from cache
 * @param {string} user User
 * @param {string} key Key to retreive
 */
export async function get(user, key) {
  return await Cache.get(`${prefix}:${key}.${user}.`)
}

/**
 * Stores a user key in cache
 * @param {string} user User
 * @param {string} key Key to set
 * @param {Object} data Key data
*/
export async function set(user, key, data) {
  // Add a final dot, in order to avoid potential user bad matches when deleting (ex. user 0 and user 01)
  return await Cache.set(`${prefix}:${key}.${user}.`, data)
}

/**
 * Return the size of the cache, in bytes
 * @returns integer
 */
export function size() {
  return Cache.size()
}