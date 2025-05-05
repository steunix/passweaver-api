/**
 * Cache with Redis
 * @module lib/cache-redis
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
*/

import { createClient } from 'redis'

let Redis

/**
 * Init Redis Cache
 */
export async function init (url) {
  Redis = await createClient({
    url
  }).connect()
}

/**
 * Returns a cache item
 * @param {string} key Key to retreive
 * @returns {any} The key
 */
export async function get (key) {
  return JSON.parse(await Redis.get(key))
}

/**
 * Set a key in cache
 * @param {string} key Key to set
 * @param {any} data
 */
export async function set (key, data) {
  return await Redis.set(key, JSON.stringify(data))
}

/**
 * Reset all keys starting with string in input
 * @param {string} keyStart Key prefix to reset
 */
export async function del (keyStart) {
  const keys = await Redis.keys(keyStart + '*')
  for (const key of keys) {
    await Redis.del(key)
  }
}

/**
 * Memory used by Redis
 * @returns Bytes
 */
export async function size () {
  const memoryInfo = await Redis.info('memory')
  const um = memoryInfo.match(/used_memory:[0-9]+/)
  return um[0].split(':')[1]
}
