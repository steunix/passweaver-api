/**
 * Google Cloud KMS
 *
 * This module provides KMS abstraction for Google Cloud KMS
 * @module lib/auth
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import crypto from 'crypto'
import * as Const from '../const.mjs'
import { KeyManagementServiceClient } from '@google-cloud/kms'

/**
 * Google KMS class for Passweaver
 */
export class KMSGoogleCloud {
  #kmsid = ''
  #type = Const.KMS_TYPE_GOOGLECLOUD
  #config = {}
  kmsclient = null
  #keyname = ''
  #description = ''

  /**
   * Constructor
   * @param {String} id KMS id
   * @param {String} config Configuration string
   * @param {String} description KMS description
   */
  constructor (id, config, description) {
    this.#kmsid = id
    this.#config = JSON.parse(config)
    this.#description = description
  }

  /**
   * Initialize object
   */
  async init () {
    this.kmsclient = new KeyManagementServiceClient()
    this.#keyname = this.kmsclient.cryptoKeyPath(
      this.#config.projectId,
      this.#config.locationId,
      this.#config.keyRingId,
      this.#config.keyId
    )
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
    const encDEK = await this.#encryptDEK(dek)

    return {
      kmsId: this.#kmsid,
      dek: encDEK.encrypted,
      kekversion: encDEK.kekversion,
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
    const dekDecrypted = await this.#decryptDEK(dek)

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
   * @return {Object} Encrypted DEK in base64
   */
  async #encryptDEK (dek) {
    const encryptRequest = {
      name: this.#keyname,
      plaintext: dek
    }

    const resp = await this.kmsclient.encrypt(encryptRequest)
    const encrypted = resp[0].ciphertext

    return {
      encrypted: encrypted.toString('base64'),
      kekversion: resp[0].name.split('/').pop()
    }
  }

  /**
   * Decrypts the DEK
   * @param {String} dek DEK encoded in base64
   * @returns UInt8Array decrypted key
   */
  async #decryptDEK (dek) {
    const decryptRequest = {
      name: this.#keyname,
      ciphertext: Buffer.from(dek, 'base64')
    }

    const resp = await this.kmsclient.decrypt(decryptRequest)
    const decrypted = resp[0].plaintext

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
