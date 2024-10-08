/**
 * User settings controller module
 * @module controllers/usersettings
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as R from '../../../lib/response.mjs'
import DB from '../../../lib/db.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'

/**
 * Get user settings
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Error callback
 * @returns
 */
export async function get (req, res, next) {
  const userid = req.params.id

  // Settings can be read only by the owner
  if (req.user !== userid) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Search item
  const settings = await DB.usersettings.findMany({
    where: { userid },
    select: {
      setting: true,
      value: true
    }
  })

  res.send(R.ok(settings))
}

/**
 * Set user settings
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Error callback
 * @returns
 */
export async function set (req, res, next) {
  const userid = req.params.id

  // Settings can be written only by the owner
  if (req.user !== userid) {
    res.status(R.FORBIDDEN).send(R.forbidden())
    return
  }

  // Validate payload
  if (!JV.validate(req.body, 'usersettings_create')) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  // Set settings. Empty values will delete the setting
  await DB.$transaction(async (tx) => {
    for (const setting of req.body) {
      await DB.usersettings.deleteMany({
        where: { userid, setting: setting.setting }
      })
      if (setting.value !== '') {
        // Delete setting
        await DB.usersettings.create({
          data: {
            userid,
            setting: setting.setting,
            value: setting.value
          }
        })
      }
    }
  })

  res.status(R.CREATED).send(R.ok())
}
