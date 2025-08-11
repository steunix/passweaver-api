/**
 * Local file KMS
 *
 * This module provides KMS abstraction for KEK stored in local file
 * @module lib/auth
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { readFile } from 'fs/promises'
import crypto from 'crypto'
import * as Const from '../const.mjs'

/**
 * Local file KMS class for Passweaver
 */
export class KMSLocalFile {
  #kmsid = ''
  #masterKeyPath = ''
  #masterKey = ''
  #type = Const.KMS_TYPE_LOCALFILE
  #description = ''

  /**
   * Constructor
   * @param {String} id KMS id
   * @param {String} config Configuration string
   * @param {String} description KMS description
   */
  constructor (id, config, description) {
    this.#kmsid = id
    this.#masterKeyPath = JSON.parse(config).master_key_path
    this.#description = description
  }

  /**
   * Initialize object
   */
  async init () {
    const enckey = await readFile(
      new URL(this.#masterKeyPath, import.meta.url)
    )
    this.#masterKey = Buffer.from(enckey.toString(), 'base64')
  }

  /**
   * Encrypts data
   * @param {string} data Data to encrypt
   * @param {string} algorithm Encryption algorithm
   * @returns {Object} Encrypted structure
   */
  async encrypt (data, algorithm) {
    const dek = this.#generateDEK()

    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(algorithm, dek, iv)

    let encrypted = cipher.update(data, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag().toString('base64')
    const encDEK = this.#encryptDEK(dek)

    return {
      kmsId: this.#kmsid,
      dek: encDEK.iv + ':' + encDEK.encrypted + ':' + encDEK.authTag,
      kekversion: null,
      algo: algorithm,
      iv: iv.toString('base64'),
      authTag,
      encrypted
    }
  }

  /**
   * Decrypts data; DEK is ignored, as this is a direct encryption KMS.
   * @param {Uint8Array} dek DEK to use
   * @param {string} data Data to decrypt
   * @param {string} iv Base64 encoded IV
   * @param {string} authTag Base64 encoded auth tag
   * @param {string} algorithm Encryption algorithm
   * @return {string} Decrypted data
   */
  async decrypt (dek, data, iv, authTag, algorithm) {
    const dekDecrypted = this.#decryptDEK(dek)

    const decipher = crypto.createDecipheriv(
      algorithm,
      dekDecrypted,
      Buffer.from(iv, 'base64')
    )

    decipher.setAuthTag(Buffer.from(authTag, 'base64'))

    let decrypted = decipher.update(data, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * Generate a DEK for AES-256-GCM encryption
   * @returns {Buffer} DEK
   */
  #generateDEK () {
    return crypto.randomBytes(32)
  }

  /**
   * Encrypts a DEK with the local filesystem master key
   * @param {Uint8Array} dek DEK to encrypt
   * @return {Object} Encrypted DEK structure
   */
  #encryptDEK (dek) {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', this.#masterKey, iv)

    let encrypted = cipher.update(dek, undefined, 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag().toString('base64')

    return {
      iv: iv.toString('base64'),
      authTag,
      encrypted
    }
  }

  /**
   * Decrypts the DEK
   * @param {String} dek DEK encoded in base64
   * @returns UInt8Array decrypted key
   */
  #decryptDEK (dek) {
    const iv = dek.split(':')[0]
    const dekData = dek.split(':')[1]
    const authTag = dek.split(':')[2]

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.#masterKey,
      Buffer.from(iv, 'base64')
    )

    decipher.setAuthTag(Buffer.from(authTag, 'base64'))

    let decrypted = decipher.update(dekData, 'base64')
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted
  }

  /**
   * Get KMS description
   * @returns {String} KMS description
   */
  getDescription () {
    return this.#description
  }
}
