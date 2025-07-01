/**
 * Crypto module
 * @module lib/crypt
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as Config from '../lib/config.mjs'
import * as crypto from 'crypto'
import bcrypt from 'bcrypt'

import * as KMS from './kms/kms.mjs'

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
 * Encrypt a string with the master key
 * @param {string} String to encrypt
 * @returns {Object} A structure with iv, authTag and encrypted string
 */
export function encrypt (string) {
  return KMS.encrypt(string, 'aes-256-gcm')
}

/**
 * Decrypt a string with the master key
 * @param {string} crypted bae64 Crypted text
 * @param {string} iv base64 IV
 * @param {string} authTag base64 auth tag
 * @returns {string} The decrypted data
 */
export function decrypt (crypted, iv, authTag, algorithm) {
  return KMS.decrypt(null, crypted, iv, authTag, algorithm || 'aes-256-gcm')
}

/**
 * Decrypt a personal key. Exctract personal password from JWT and decrypt the user personal key
 * @param {string} encrypted Encrypted personal key
 * @param {string} personaltoken Personal token
 * @returns A Buffer containing the decrypted personal key
 */
export function decryptPersonalKey (encrypted, personaltoken) {
  // Decrypt with personal password
  const password = extractPersonalPassword(personaltoken)
  const hash = crypto.pbkdf2Sync(password, Config.get().master_key, 12, 32, 'sha256')

  const decipher = crypto.createDecipheriv(
    'aes-256-ecb',
    hash,
    ''
  )
  const decrypted = decipher.update(encrypted, 'base64')

  return decrypted
}

/**
 * Extract a personal password from a personal key
 * @param {string} personaltoken User personal token
 */
export function extractPersonalPassword (personaltoken) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Config.get().personal_key,
    Config.get().personal_iv
  )

  let decrypted = decipher.update(personaltoken, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted.substring(Config.get().personal_seed.length)
}

/**
 * Create a random AES key, using PBKDF2 on random bytes
 */
export function randomAESKey () {
  const rnd = randomBytes(32)
  const key = crypto.pbkdf2Sync(rnd, randomBytes(16), 12, 32, 'sha256')
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
