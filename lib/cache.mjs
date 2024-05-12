/**
 * Cache module
 * @module lib/cache
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
 * @param {string} key Key to retreive
 * @returns {any} The key
 */
function _get(key) {
  return Cache.get(key)
}

/**
 * Set a key in cache
 * @param {string} key Key to set
 * @param {any} data
 */
function _set(key, data) {
  return Cache.set(key, data)
}

/**
 * Reset all keys starting with string in input
 * @param {string} keyStart Key prefix to reset
 */
export function reset(keyStart) {
  const k = `passweaver.${keyStart}`
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
  var k = `passweaver.${foldersTreeKey}`
  reset(k)

  k = `passweaver.${foldersReadableKey}`
  reset(k)
}

/**
 * Reset groups tree cache
 */
export function resetGroupsTree() {
  const k = `passweaver.${groupsTreeKey}`
  reset(k)
}

/**
 * Gets a user key from cache
 * @param {string} user User
 * @param {string} key Key to retreive
 */
export function get(user, key) {
  const k = `passweaver.${key}.${user}`
  return _get(k)
}

/**
 * Stores a user key in cache
 * @param {string} user User
 * @param {string} key Key to set
 * @param {Object} data Key data
 */
export function set(user, key, data) {
  const k = `passweaver.${key}.${user}`
  return _set(k, data)
}

/**
 * Return the size of the cache, in bytes
 * @returns integer
 */
export function size() {
  return Cache.getStats().vsize + Cache.getStats().ksize
}