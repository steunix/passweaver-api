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

export class KMSNoDEK {
  #kmsid = ''
  #masterKey = ''
  #type = Const.KMS_TYPE_NODEK
  #description = ''

  /**
   * Constructor
   * @param {String} id KMS id
   * @param {String} config Configuration string
   * @param {String} description KMS description
   */
  constructor (id, config, description) {
    this.#kmsid = id
    this.#masterKey = Config.get().master_key
    this.#description = description
  }

  /**
   * Initialize object
   */
  async init () {
  }

  /**
   * Encrypts data; DEK is ignored, as this is a direct encryption KMS.
   * @param {string} data Data to encrypt
   * @param {string} algorithm Encryption algorithm
   * @returns A structure containing the IV, the encrypted data and the auth tag, separated by a colon (base64 encoded).
   */
  async encrypt (data, algorithm) {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(algorithm, this.#masterKey, iv)

    let encrypted = cipher.update(data, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag().toString('base64')

    return {
      kmsId: this.#kmsid,
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
  async decrypt (dek, data, iv, authTag, algorithm) {
    const decipher = crypto.createDecipheriv(
      algorithm,
      this.#masterKey,
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
  generateDEK () {
    return crypto.randomBytes(32)
  }

  /**
   * Encrypts a DEK with the local filesystem master key. Stub function for direct encryption KMS.
   * @param {Uint8Array} dek DEK to encrypt
   * @return {Object} A structure containing the IV, the encrypted DEK and the auth tag, separated by a colon (base64 encoded).
   */
  encryptDEK (dek) {
    return {
      kmsMode: this.#type,
      iv: null,
      authTag: null,
      encrypted: null
    }
  }

  /**
   * Get KMS description
   * @returns {String} KMS description
   */
  getDescription () {
    return this.#description
  }
}
