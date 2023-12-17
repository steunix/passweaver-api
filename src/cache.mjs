/**
 * Cache module
 * @module src/cache
 */

import Sizeof from "object-sizeof"

console.log("Initializing cache...")
let cache = {}

/**
 * Returns a cache item
 * @param {string} key
 * @returns {any} The key
 */
export function get(key) {
  if ( cache[key] ) {
    return cache[key]
  } else {
    return null
  }
}

/**
 * Set a key in cache
 * @param {string} key
 * @param {any} data
 */
export function set(key, data) {
  cache[key] = data
}

/**
 * Reset all keys starting with string in input
 * @param {string} keyStart
 */
export function reset(keyStart) {
  for ( const elem of Object.keys(cache) ) {
    if ( elem.startsWith(keyStart)!==null ) {
      delete cache[elem]
    }
  }
}

/**
 * Return the size of the cache
 * @returns integer
 */
export function size() {
  return Sizeof(cache)
}