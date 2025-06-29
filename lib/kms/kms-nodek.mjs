/**
 * No DEK encryption/decryption KMS
 *
 * This module provides KMS abstraction for the raw, DEK-less encryption and decryption initially used in Passweaver.
 * @module lib/auth
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import crypto from 'crypto'
import * as Config from '../config.mjs'
import * as Const from '../const.mjs'

/**
 * Encrypts data; DEK is ignored, as this is a direct encryption KMS.
 * @param {string} data Data to encrypt
 * @param {string} algorithm Encryption algorithm
 * @returns A structure containing the IV, the encrypted data and the auth tag, separated by a colon (base64 encoded).
 */
export function encrypt (data, algorithm) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(algorithm, Config.get().master_key, iv)

  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const authTag = cipher.getAuthTag().toString('base64')

  return {
    kmsMode: Const.KMS_TYPE_NODEK,
    dek: null, // No DEK in this KMS
    kekversion: null, // No KEK version in this KMS
    algo: algorithm,
    iv: iv.toString('base64'),
    authTag,
    encrypted
  }
}

/**
 * Decrypts data; DEK is ignored, as this is a direct encryption KMS.
 * @param {*} dek Parameter is ignored, as this is a direct encryption KMS.
 * @param {string} data Data to decrypt
 * @param {string} iv Base64 encoded IV
 * @param {string} authTag Base64 encoded auth tag
 * @param {string} algorithm Encryption algorithm
 * @return {string} Decrypted data
 */
export function decrypt (dek, data, iv, authTag, algorithm) {
  const decipher = crypto.createDecipheriv(
    algorithm,
    Config.get().master_key,
    Buffer.from(iv, 'base64')
  )

  decipher.setAuthTag(Buffer.from(authTag, 'base64'))

  let decrypted = decipher.update(data, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Generate a DEK for AES-256-GCM encryption
 * @returns {string} Base64 encoded DEK
 */
export function generateDEK () {
  return crypto.randomBytes(32)
}

/**
 * Encrypts a DEK with the local filesystem master key. Stub function for direct encryption KMS.
 * @param {Uint8Array} dek DEK to encrypt
 * @return {Object} A structure containing the IV, the encrypted DEK and the auth tag, separated by a colon (base64 encoded).
 */
export function encryptDEK (dek) {
  return {
    kmsMode: Const.KMS_TYPE_NODEK,
    iv: null,
    authTag: null,
    encrypted: null
  }
}
