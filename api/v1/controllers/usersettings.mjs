/**
 * User settings controller module
 * @module controllers/usersettings
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonschema from 'jsonschema'

import { newId } from '../../../lib/id.mjs'
import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as Const from '../../../lib/const.mjs'
import DB from '../../../lib/db.mjs'

// Payload schemas
const setSchema = {
  "id": "create",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "setting": { "type": "string", "maxLength": 30 },
      "value": { "type": "string", "maxLength": 100 }
    },
    required: ["setting","value"]
  }
}

/**
 * Get user settings
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Error callback
 * @returns
 */
export async function get(req, res, next) {
  try {
    const userid = req.params.id

    // Settings can be read only by the owner
    if ( req.user!==userid) {
      res.status(403).send(R.forbidden())
      return
    }

    // Search item
    const settings = await DB.usersettings.findMany({
      where: { userid: userid },
      select: {
        setting: true,
        value: true
      }
    })

    res.status(200).send(R.ok(settings))
  } catch (err) {
    next(err)
  }
}

/**
 * Set user settings
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Error callback
 * @returns
 */
export async function set(req, res, next) {
  try {
    const userid = req.params.id

    // Settings can be written only by the owner
    if ( req.user!==userid) {
      res.status(403).send(R.forbidden())
      return
    }

    // Validate payload
    const validate = jsonschema.validate(req.body, setSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.badRequest())
      return
    }

    // Set settings. Empty values will delete the setting
    await DB.$transaction(async(tx)=> {
      for ( const setting of req.body ) {
        await DB.usersettings.deleteMany({
          where: { userid: userid, setting: setting.setting }
        })
        if ( setting.value!=="" ) {
          // Delete setting
          await DB.usersettings.create({
            data: {
              id: newId(),
              userid: userid,
              setting: setting.setting,
              value: setting.value
            }
          })
        }
      }
    })

    res.status(201).send(R.ok())
  } catch (err) {
    next(err)
  }
}
