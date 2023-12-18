/**
 * Cache module
 * @module src/cache
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import NodeCache from 'node-cache'

const Cache = new NodeCache()

console.log("Initializing cache...")

/**
 * Returns a cache item
 * @param {string} key
 * @returns {any} The key
 */
export function get(key) {
  return Cache.get(key)
}

/**
 * Set a key in cache
 * @param {string} key
 * @param {any} data
 */
export function set(key, data) {
  return Cache.set(key, data)
}

/**
 * Reset all keys starting with string in input
 * @param {string} keyStart
 */
export function reset(keyStart) {
  const keys = Cache.keys()
  for ( const key of keys ) {
    if ( key.startsWith(keyStart)!==null ) {
      Cache.del(key)
    }
  }
}

/**
 * Return the size of the cache
 * @returns integer
 */
export function size() {
  return Cache.getStats().vsize + Cache.getStats().ksize
}