/**
 * Util controller module
 * @module controllers/util
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import * as R from '../../../src/response.mjs'

import generator from 'generate-password'

/**
 * Generate a password
 * @param {object} req Express request
 * @param {object} res Express response
 */
export async function generatePassword(req, res, next) {
  try {
    var pwd = generator.generate({
      length: 15,
      numbers: true,
      symbols: true,
      lowercase: true,
      uppercase: true,
      strict: true
    })

    res.status(200).send(R.ok({password: pwd}))
  } catch (err) {
    next(err)
  }
}

