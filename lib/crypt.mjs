/**
 * Crypto module
 * @module lib/crypt
 * @author Stefano Rivoir <rs4000@gmail.com>
 */
import * as Config from '../lib/config.mjs'
import * as crypto from 'crypto'
import bcrypt from "bcrypt"

/**
 * Hashes a plain text password
 * @param {string} string String to hash
 * @returns {string} Base64 encoded hash
 */
export async function hashPassword(string) {
  return (await bcrypt.hash(string, 12))
}

/**
 * Check a password against a hash
 * @param {string} password Password to check
 * @param {string} hash Hash to check the password against
 * @returns {string} Base64 encoded hash
 */
export async function checkPassword(password, hash) {
  return await bcrypt.compare(password, hash)
}

/**
 * Encrypts a string with the master key
 * @param {string} String to encrypt
 * @returns {Object} A structure with iv, authTag and encrypted string
 */
export function encrypt(string) {
  let ret = {
    algo: "aes-256-gcm"
  }
  let iv = crypto.randomBytes(12)

  let cipher = crypto.createCipheriv(
    ret.algo,
    Config.get().master_key,
    iv
  )

  ret.iv = iv.toString("base64")
  ret.encrypted = cipher.update(string, 'utf8', 'base64')
  ret.encrypted += cipher.final('base64')

  ret.authTag = cipher.getAuthTag().toString('base64')

  return ret
}

/**
 * Decrypts a string with the master key
 * @param {string} crypted bae64 Crypted text
 * @param {string} iv base64 IV
 * @param {string} authTag base64 auth tag
 * @returns {string} The decrypted data
 */
export function decrypt(crypted, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Config.get().master_key,
    Buffer.from(iv, 'base64')
  )

  decipher.setAuthTag(Buffer.from(authTag, 'base64'))

  let decrypted = decipher.update(crypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Create a random string and convert to hex
 * @param {number} length Length of the string
 * @returns
 */
export function randomString(length) {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Create random bytes
 * @param {number} length Length of the string
 * @returns
 */
export function randomBytes(length) {
  return crypto.randomBytes(length)
}

/**
 * Decrypt a personal key
 * @param {string} encrypted Encrypted personal key
 * @param {string} personaltoken Personal token
 */
export function decryptPersonalKey(encrypted, personaltoken) {
  // Decrypt with personal password
  const password = extractPersonalPassword(personaltoken)
  const hash = crypto.pbkdf2Sync(password, Config.get().master_key, 12, 32, 'sha256')

  const decipher = crypto.createDecipheriv(
    "aes-256-ecb",
    hash,
    ''
  )
  let decrypted = decipher.update(encrypted, 'base64')

  return decrypted
}

/**
 * Encrypts a string with the personal key. First, it encrypts the data with AES-256 (that does not require an IV) using
 * a password hash as key. Then it re-encrypt using the master key
 * @param {string} personalkey Personal key
 * @param {string} string String to encrypt
 * @param {string} personaltoken User password token
 * @returns {Object} A structure with iv, authTag and encrypted string
 */
export function encryptPersonal(string, personalkey, personaltoken) {
  const pkey = decryptPersonalKey(personalkey, personaltoken)

  // Encrypt with AES-256-ECB, it does not require IV
  let cipher = crypto.createCipheriv('aes-256-ecb', pkey, '')

  var encrypted = cipher.update(string, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  // Re-encrypt with master key
  return encrypt(encrypted)
}

/**
 * Decrypts a string with the personal token
 * @param {string} string base64 Crypted text
 * @param {string} personalkey User personal key
 * @param {string} personaltoken User personal token
 * @returns {string} The decrypted data
 */
export function decryptPersonal(string, iv, authtag, personalkey, personaltoken) {
  // Decrypt personal key
  const pkey = decryptPersonalKey(personalkey, personaltoken)

  // Decrypt item with master key
  const mdecrypt = decrypt(string,iv,authtag)

  // Decrypt with personal key
  const decipher = crypto.createDecipheriv(
    "aes-256-ecb",
    pkey,
    ''
  )
  let decrypted = decipher.update(mdecrypt, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Extracts a personal password from a personal key
 * @param {string} personaltoken User personal token
 */
export function extractPersonalPassword(personaltoken) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Config.get().personal_key,
    Config.get().personal_iv
  )

  let decrypted = decipher.update(personaltoken, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted.substring(Config.get().personal_seed.length)
}

/**
 * Creates a random AES key
 */
export function randomAESKey() {
  const rnd = randomBytes(32)
  const key = crypto.pbkdf2Sync(rnd, randomBytes(16), 12, 32, 'sha256')
  return key
}
