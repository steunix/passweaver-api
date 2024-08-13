/**
 * Config module
 * @module lib/config
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { readFile } from 'fs/promises'
import jsonschema from 'jsonschema'

import * as Crypt from "./crypt.mjs"

// Config validation schema
const configSchema = {
  "id": "config",
  "type": "object",
  "properties": {
    "master_key_file" : { "type": "string" },
    "jwt_duration" : { "type": "string" },
    "listen_port": { "type": "integer", "minimum": 1, "maximum": 65535 },
    "log_dir": { "type": "string" },
    "ldap": {
      "type": "object",
      "properties": {
        "url": { "type": "string" },
        "port": { "type": "integer", "minimum": 1, "maximum": 65535 },
        "baseDn": { "type": "string" },
        "userDn": { "type": "string" }
      },
      "dependencies": {
        "url": [ "port", "baseDn", "userDn"]
      }
    },
    "https": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "certificate": { "type": "string" },
        "private_key": { "type": "string" },
        "hsts": { "type": "boolean" }
      },
      "required": [ "enabled" ]
    },
    "redis": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "url": { "type": "string" }
      },
      "required": [ "enabled" ]
    }
  },
  "required": ["master_key_file", "jwt_duration", "listen_port", "log_dir", "https", "redis"]
}

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
const validate = jsonschema.validate(config, configSchema)
if ( !validate.valid ) {
  console.error("config.json is invalid, please verify the following:")
  console.error(validate.toString())
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
