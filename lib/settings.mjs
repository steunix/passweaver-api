/**
 * Settings module for the application
 * @module lib/settings
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import DB from './db.mjs'

/**
 * Get user settings
 * @param {string} userid User id
 * @returns
 */
export async function get (userid) {
  // Search item
  const settings = await DB.usersettings.findMany({
    where: { userid },
    select: {
      setting: true,
      value: true
    }
  })

  return settings
}

/**
 * Set user settings
 * @param {string} userid User ID
 * @param {string} setting Setting
 * @param {string} value Setting value
 * @returns
 */
export async function set (userid, setting, value) {
  // Set settings. Empty values will delete the setting
  await DB.$transaction(async (tx) => {
    await DB.usersettings.deleteMany({
      where: { userid, setting }
    })
    if (value !== '') {
      // Delete setting
      await DB.usersettings.create({
        data: {
          userid,
          setting,
          value
        }
      })
    }
  })

  return true
}
