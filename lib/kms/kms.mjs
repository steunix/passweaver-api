/**
 * KMS module for Passweaver
 *
 * This module provides KMS abstraction
 * @module lib/auth
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { KMSLocalFile } from './kms-localfile.mjs'
import { KMSNoDEK } from './kms-nodek.mjs'
import * as Const from '../const.mjs'

import DB from '../db.mjs'
import { KMSGoogleCloud } from './kms-google.mjs'

const Wallet = { }
let ActiveKMS = ''

async function getKMS (kmsid) {
  if (kmsid === null || kmsid === undefined) {
    kmsid = 'none'
  }
  let kms = Wallet[kmsid]

  // Valorize wallet with the KMS
  if (!kms) {
    let reckms
    if (kmsid === 'none') {
      reckms = {
        type: Const.KMS_TYPE_NODEK,
        config: null
      }
    } else {
      reckms = await DB.kms.findUnique({
        where: { id: kmsid },
        select: {
          type: true,
          config: true
        }
      })
    }

    switch (reckms.type) {
      case Const.KMS_TYPE_LOCALFILE:
        Wallet[kmsid] = new KMSLocalFile(kmsid, reckms.config)
        break
      case Const.KMS_TYPE_GOOGLECLOUD:
        Wallet[kmsid] = new KMSGoogleCloud(kmsid, reckms.config)
        break
      default:
        // Defaults to no DEK
        Wallet[kmsid] = new KMSNoDEK(null, null)
    }
    await Wallet[kmsid].init()
    kms = Wallet[kmsid]
  }
  return kms
}

/**
 * Encrypt data using the specified KMS mode.
 * @param {String} data Data to encrypt
 * @param {String} algorithm Alorithm to use for encryption
 * @returns Structure containing the encrypted data, and various other data
 */
export async function encrypt (data, algorithm) {
  if (ActiveKMS === '') {
    // Get active KMS from DB
    const rec = await DB.kms.findFirst({
      where: { active: true }
    })
    if (rec === null) {
      throw new Error('No active KMS found')
    }
    ActiveKMS = rec.id
  }
  const kms = await getKMS(ActiveKMS)

  // Call KMS to encrypt
  return await kms.encrypt(data, algorithm)
}

/**
 * Decrypt data using the specified KMS mode.
 * @param {String} kmsid KMS ID to use
 * @param {Uint8Array} dek DEK to use
 * @param {String} data Data to decrypt
 * @param {String} iv IV to use for decryption
 * @param {String} authTag Authentication tag to use for decryption
 * @param {String} algorithm Algorithm to use for decryption
 * @returns Decrypted data
 */
export async function decrypt (kmsid, dek, data, iv, authTag, algorithm) {
  const kms = await getKMS(kmsid)

  // Call KMS to decrypt
  return await kms.decrypt(dek, data, iv, authTag, algorithm)
}
