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
import * as Metrics from '../metrics.mjs'

const Wallet = { }
const KMSDescriptions = { }
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
        config: null,
        description: 'No DEK'
      }
    } else {
      reckms = await DB.kms.findUnique({
        where: { id: kmsid },
        select: {
          type: true,
          config: true,
          description: true
        }
      })
    }

    // Store the description for metrics
    KMSDescriptions[kmsid] = reckms.description

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
 * @returns {{ kmsId: string, dek: string, kekversion: string, algo: string, iv: string, authTag: string, encrypted: string}}
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
  const ret = await kms.encrypt(data, algorithm)

  // Increment both global and per-KMS counters
  Metrics.counterInc(Const.METRICS_KMS_ENCRYPTIONS)
  Metrics.counterInc(Const.METRICS_KMS_ENCRYPTIONS_PER_KMS, '', {
    kms_id: ActiveKMS,
    kms_description: KMSDescriptions[ActiveKMS] || 'Unknown'
  })
  return ret
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
  const ret = await kms.decrypt(dek, data, iv, authTag, algorithm)

  // Increment both global and per-KMS counters
  Metrics.counterInc(Const.METRICS_KMS_DECRYPTIONS)
  Metrics.counterInc(Const.METRICS_KMS_DECRYPTIONS_PER_KMS, '', {
    kms_id: kmsid,
    kms_description: KMSDescriptions[kmsid] || 'Unknown'
  })
  return ret
}
