/**
 * Config module
 * @module lib/config
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { readFile } from 'fs/promises'
import * as JV from './jsonvalidator.mjs'

import * as Crypt from "./crypt.mjs"

// Reads package.json
const packagejson = JSON.parse(
  await readFile(
    new URL('../package.json', import.meta.url)
  )
)

// Reads the configuration from file
var config
try {
  config = JSON.parse(
    await readFile(
      new URL('../config.json', import.meta.url)
    )
  )
} catch(err) {
  console.error("config.json not found or not a valid JSON file")
  process.exit(1)
}

// Validate config against schema
const valid = JV.validate(config, "system_config")
if ( !valid ) {
  console.error("config.json is invalid")
  process.exit(2)
}

// Retrieves the master key from environment
console.log(`Reading master key file '${config.master_key_file}'...`)
try {
  let key_enc = await readFile(
    new URL(config.master_key_file, import.meta.url)
  )
  config.master_key = new Buffer.from(key_enc.toString(), 'base64')
} catch (err) {
  console.error(`File not found or not readable`)
  process.exit(3)
}

if ( config.master_key===undefined ) {
  console.error("Cannot read master key, environment variable is empty or not set")
  process.exit(4)
}

// Sets the JWT key
console.log("Generating JWT key...")
config.jwt_key = Crypt.randomString(32)

console.log("Generating personal key...")
config.personal_key = Crypt.randomBytes(32)
config.personal_iv  = Crypt.randomBytes(16)
config.personal_seed= Crypt.randomString(8)

config.startuptime = (new Date()).toISOString()

/**
 * Returns the configuration stored in config.json
 * @returns {Object} The configuration
 */
export function get() {
  return config
}

/**
 * Reads the package.json of the project
 * @returns {Object} Returns package.json content
 */
export function packageJson() {
  return packagejson
}
