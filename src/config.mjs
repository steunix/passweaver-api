/**
 * Config module
 * @module src/config
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { readFile } from 'fs/promises';

// Reads package.json
const packagejson = JSON.parse(
  await readFile(
    new URL('../package.json', import.meta.url)
  )
)

// Reads the configuration from file
var json
try {
  json = JSON.parse(
    await readFile(
      new URL('../config.json', import.meta.url)
    )
  )
} catch(err) {
  console.error("config.json not found or invalid")
  process.exit(1)
}

let config = json

// Retreives the master key from environment
console.log("Reading master key from environment ("+config.master_key_env+")")
config.master_key = process.env[config.master_key_env]

// Retreives the JWT key from environment
console.log("Reading JWT key from environment ("+config.jwt_key_env+")")
config.jwt_key = process.env[config.jwt_key_env]

/**
 * Returns the configuration stored in config.json
 * @returns {Object} The configuration
 */
export function get() {
  return json
}

/**
 * Reads the package.json of the project
 * @returns {Object} Returns package.json content
 */
export function packageJson() {
  return packagejson
}