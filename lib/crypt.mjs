/**
 * Crypto module
 * @module lib/crypt
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as Config from '../lib/config.mjs'
import * as crypto from 'crypto'
import bcrypt from 'bcrypt'

/**
 * Hash a plain text password
 * @param {string} string String to hash
 * @returns {string} Base64 encoded hash
 */
export async function hashPassword (string) {
  return (await bcrypt.hash(string, 12))
}

/**
 * Check a password against a hash
 * @param {string} password Password to check
 * @param {string} hash Hash to check the password against
 * @returns {string} Base64 encoded hash
 */
export async function checkPassword (password, hash) {
  return await bcrypt.compare(password, hash)
}

/**
 * Decrypt a personal key. Extract personal password from JWT and decrypt the user personal key
 * @param {string} ekey Encrypted personal key
 * @param {string} personaltoken Personal token
 * @returns A Buffer containing the decrypted personal key
 */
export function decryptPersonalKey (ekey, personaltoken) {
  // Extract password and seed from personal token
  const data = decodePersonalToken(personaltoken)

  const hash = crypto.pbkdf2Sync(data.password, data.seed.length ? data.seed : Config.get().master_key, 10000, 32, 'sha256')

  // Clear the data buffers
  data.password.fill(0)
  data.seed.fill(0)

  const decipher = crypto.createDecipheriv(
    'aes-256-ecb',
    hash,
    ''
  )
  let decrypted = decipher.update(ekey, 'base64')
  decrypted = Buffer.concat([decrypted, decipher.final()])

  hash.fill(0)

  return decrypted
}

/**
 * Extract personal password and seed from the personal token used in the JWT
 * @param {string} personaltoken User personal token
 */
export function decodePersonalToken (personaltoken) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Config.get().personal_key,
    Config.get().personal_iv
  )

  let decrypted = decipher.update(personaltoken, 'base64')
  decrypted = Buffer.concat([decrypted, decipher.final()])

  const pos = decrypted.indexOf(':')

  const seed = decrypted.subarray(0, pos)
  const password = decrypted.subarray(pos + 1)

  return {
    seed,
    password
  }
}

/**
 * Create a random AES key, using PBKDF2 on random bytes
 */
export function randomAESKey () {
  const rnd = randomBytes(32)
  const key = crypto.pbkdf2Sync(rnd, randomBytes(16), 10000, 32, 'sha256')
  return key
}

/**
 * Create a random string and convert to hex
 * @param {number} length Length of the string
 * @returns
 */
export function randomString (length) {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Create random bytes
 * @param {number} length Length of the string
 * @returns
 */
export function randomBytes (length) {
  return crypto.randomBytes(length)
}

/**
 * Create an encrypted AES-256-CBC block payload based on given key and data
 * @param {Buffer} key Key to use for encryption
 * @param {string} data Data to encrypt
 */
export function encryptedPayload (key, data) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  return `${iv.toString('base64')}:${encrypted}`
}
