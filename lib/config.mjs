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
    "master_key_env" : { "type": "string" },
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
    }
  },
  "required": ["master_key_env", "jwt_duration", "listen_port", "log_dir", "https"]
}

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
  console.error("config.json not found or not a valid JSON file")
  process.exit(1)
}

// Validate config against schema
const validate = jsonschema.validate(json, configSchema)
if ( !validate.valid ) {
  console.error("config.json is invalid, please verify the following:")
  console.error(validate.toString())
  process.exit(1)
}

let config = json

// Retreives the master key from environment
console.log("Reading master key from environment ("+config.master_key_env+")")
config.master_key = process.env[config.master_key_env]

// Sets the JWT key
console.log("Generating JWT key")
config.jwt_key = Crypt.randomString(32)

config.startuptime = (new Date()).toISOString()

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