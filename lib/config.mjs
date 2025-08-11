/**
 * Config module
 * @module lib/config
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { readFile } from 'fs/promises'
import * as JV from './jsonvalidator.mjs'
import * as Crypt from './crypt.mjs'

const AUTO_TEST = process.env?.PASSWEAVER_AUTO_TEST === '1'

// Reads package.json
const packagejson = JSON.parse(
  await readFile(
    new URL('../package.json', import.meta.url)
  )
)

// Reads the configuration from file
let config
try {
  config = JSON.parse(
    await readFile(
      new URL((AUTO_TEST ? '../test/config-test.json' : '../config.json'), import.meta.url)
    )
  )
} catch (err) {
  console.error('config.json not found or not a valid JSON file')
  process.exit(1)
}

// Validate config against schema
const valid = JV.validate(config, 'system_config')
if (!valid) {
  console.error('config.json is invalid:')
  console.error(JV.errors())
  process.exit(2)
}

// Retrieves the master key from environment, or generate one if automated testing
if (AUTO_TEST) {
  console.log('Generating random master key file...')
  config.master_key = Crypt.randomBytes(32)
} else {
  console.log(`Reading master key file '${config.master_key_file}'...`)
  try {
    const keyEnc = await readFile(
      new URL(config.master_key_file, import.meta.url)
    )
    config.master_key = Buffer.from(keyEnc.toString(), 'base64')
  } catch (err) {
    console.error('File not found or not readable')
    process.exit(3)
  }

  if (config.master_key === undefined) {
    console.error('Cannot read master key, environment variable is empty or not set')
    process.exit(4)
  }
}

// Sets the JWT key
generateJWTKey()

console.log('Generating personal data encryption key...')
config.personal_key = Crypt.randomBytes(32)
config.personal_iv = Crypt.randomBytes(16)

config.startuptime = (new Date()).toISOString()

// Read LDAP certificates if needed
if (config.ldap?.tlsOptions.cert) {
  try {
    config.ldap.tlsOptions.cert = await readFile(new URL(config.ldap.tlsOptions.cert, import.meta.url))
    config.ldap.tlsOptions.ciphers = 'DEFAULT@SECLEVEL=0'
  } catch (err) {
    console.error('LDAP certificate not found or not readable')
    process.exit(5)
  }
}
if (config.ldap?.tlsOptions.ca) {
  try {
    config.ldap.tlsOptions.ca = await readFile(new URL(config.ldap.tlsOptions.ca, import.meta.url))
  } catch (err) {
    console.error('LDAP ca not found or not readable')
    process.exit(5)
  }
}

/**
 * Returns the configuration stored in config.json
 * @returns {Object} The configuration
 */
export function get () {
  return config
}

/**
 * Reads the package.json of the project
 * @returns {Object} Returns package.json content
 */
export function packageJson () {
  return packagejson
}

export function generateJWTKey () {
  console.log('Generating JWT encryption key...')
  config.jwt_key = Crypt.randomString(32)
}
