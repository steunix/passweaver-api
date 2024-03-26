/**
 * Cache module
 * @module src/cache
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import NodeCache from 'node-cache'

const Cache = new NodeCache()
export const foldersTreeKey = "folderstree"
export const foldersReadableKey = "foldersreadable"
export const groupsTreeKey = "groupstree"

console.log("Initializing cache...")

/**
 * Returns a cache item
 * @param {string} key
 * @returns {any} The key
 */
function _get(key) {
  return Cache.get(key)
}

/**
 * Set a key in cache
 * @param {string} key
 * @param {any} data
 */
function _set(key, data) {
  return Cache.set(key, data)
}

/**
 * Reset all keys starting with string in input
 * @param {string} keyStart
 */
export function reset(keyStart) {
  const k = "vaulted."+keyStart
  const keys = Cache.keys()
  for ( const key of keys ) {
    if ( key.startsWith(k)!==null ) {
      Cache.del(key)
    }
  }
}

/**
 * Resets folders tree cache
 */
export function resetFoldersTree() {
  var k = "vaulted."+foldersTreeKey
  reset(k)

  k = "vaulted."+foldersReadableKey
  reset(k)
}

/**
 * Reset groups tree cache
 */
export function resetGroupsTree() {
  const k = "vaulted."+groupsTreeKey
  reset(k)
}

/**
 * Gets a key from cache
 * @param {string} user
 * @param {string} key
 */
export function get(user, key) {
  const k = "vaulted."+key+"."+user
  return _get(k)
}

/**
 * Stores a key
 * @param {string} user
 * @param {string} key
 */
export function set(user, key, data) {
  const k = "vaulted."+key+"."+user
  return _set(k, data)
}

/**
 * Return the size of the cache
 * @returns integer
 */
export function size() {
  return Cache.getStats().vsize + Cache.getStats().ksize
}