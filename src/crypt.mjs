/**
 * Crypto module
 * @module src/crypt
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaClient } from '@prisma/client'

import * as Config from '../src/config.mjs'
import * as crypto from 'crypto'

const prisma = new PrismaClient(Config.get().prisma_options)

/**
 * Hashes a string
 * @param {string} string String to hash
 * @returns {string} Base64 encoded hash
 */
export function hash(string) {
  return crypto.createHash('sha512').update(string).digest('base64')
}

/**
 * Encrypts a string
 * @param {string} String to enrypt
 * @returns {Object} A structure with iv, authTag and encrypted string
 */
export function encrypt(string) {
  let ret = {}
  let iv = crypto.randomBytes(12)

  let cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Config.get().master_key,
    iv
  );

  ret.iv = iv.toString("base64")
  ret.encrypted = cipher.update(string, 'utf8', 'base64');
  ret.encrypted += cipher.final('base64');

  ret.authTag = cipher.getAuthTag().toString('base64')

  return ret
}

/**
 * Decrypts a string
 * @param {string} crypted bae64 Crypted text
 * @param {string} iv base64 I.V.
 * @param {string} authTag base64 auth tag
 * @returns {string} The decrypted data
 */
export function decrypt(crypted, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Config.get().master_key,
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'base64'))

  let decrypted = decipher.update(crypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
