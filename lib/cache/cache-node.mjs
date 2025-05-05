/**
 * Cache with node-cache
 * @module lib/cache-node
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import NodeCache from 'node-cache'

const Cache = new NodeCache()

/**
 * Init Node Cache
 */
export function init () {
}

/**
 * Returns a cache item
 * @param {string} key Key to retreive
 * @returns {any} The key
 */
export function get (key) {
  return Cache.get(key)
}

/**
 * Set a key in cache
 * @param {string} key Key to set
 * @param {any} data
 */
export function set (key, data) {
  return Cache.set(key, data)
}

/**
 * Reset all keys starting with string in input
 * @param {string} keyStart Key prefix to reset
 */
export function del (keyStart) {
  const keys = Cache.keys()

  for (const key of keys) {
    if (key.startsWith(keyStart)) {
      Cache.del(key)
    }
  }
}

/**
 * Return the size of the cache, in bytes
 * @returns integer
 */
export function size () {
  return Cache.getStats().vsize + Cache.getStats().ksize
}
