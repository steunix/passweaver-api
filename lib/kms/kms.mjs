/**
 * KMS module for Passweaver
 *
 * This module provides KMS abstraction
 * @module lib/auth
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as kmsLocalFile from './kms-localfile.mjs'
import * as kmsNoDek from './kms-nodek.mjs'

/**
 * Encrypt data using the specified KMS mode.
 * @param {*} kmsmode KMS mode
 * @param {*} dek DEK key to use
 * @param {*} data Data to encrypt
 * @param {*} algorithm Alorithm to use for encryption
 * @returns Structure containing the encrypted data, and various other data
 */
export async function encrypt (kmsmode, data, algorithm) {
  if (kmsmode === 0) {
    // KMS_TYPE_NODEK
    return kmsNoDek.encrypt(data, algorithm)
  } else if (kmsmode === 1) {
    // KMS_TYPE_LOCALFILE
    return kmsLocalFile.encrypt(data, algorithm)
  } else {
    throw new Error('Unsupported KMS mode')
  }
}

/**
 * Decrypt data using the specified KMS mode.
 * @param {Number} kmsmode KMS mode
 * @param {Uint8Array} dek DEK to use
 * @param {String} data Data to decrypt
 * @param {String} iv IV to use for decryption
 * @param {String} authTag Authentication tag to use for decryption
 * @param {String} algorithm Algorithm to use for decryption
 * @returns Decrypted data
 */
export async function decrypt (kmsmode, dek, data, iv, authTag, algorithm) {
  if (kmsmode === 0) {
    // KMS_TYPE_NODEK
    return kmsNoDek.decrypt(dek, data, iv, authTag, algorithm)
  } else if (kmsmode === 1) {
    // KMS_TYPE_LOCALFILE
    return kmsLocalFile.decrypt(dek, data, iv, authTag, algorithm)
  } else {
    throw new Error('Unsupported KMS mode')
  }
}
