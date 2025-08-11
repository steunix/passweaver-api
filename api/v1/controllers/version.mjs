/**
 * Version module
 * @module controllers/version
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as R from '../../../lib/response.mjs'
import * as Config from '../../../lib/config.mjs'

/**
 * Return PassWeaver API version
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 */
export async function version (req, res, next) {
  const version = Config.packageJson().version

  const data = {
    version
  }

  res.send(R.ok(data))
}
