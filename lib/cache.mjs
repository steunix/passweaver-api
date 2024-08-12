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
function reset(keyStart) {
  const keys = Cache.keys()

  for ( const key of keys ) {
    if ( key.startsWith(keyStart) ) {
      Cache.del(key)
    }
  }
}

/**
 * Resets folders tree cache
 * @param {string} user If provided only cache for this user will be reset
 */
export function resetFoldersTree(user) {
  var k = `passweaver.${foldersTreeKey}`
  if ( user ) {
    k += `.${user}`
  }
  reset(k)

  k = `passweaver.${foldersReadableKey}`
  if ( user ) {
    k += `.${user}`
  }
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
  return _get(`passweaver.${key}.${user}`)
}

/**
 * Stores a user key in cache
 * @param {string} user User
 * @param {string} key Key to set
 * @param {Object} data Key data
 */
export function set(user, key, data) {
  return _set(`passweaver.${key}.${user}`, data)
}

/**
 * Return the size of the cache, in bytes
 * @returns integer
 */
export function size() {
  return Cache.getStats().vsize + Cache.getStats().ksize
}