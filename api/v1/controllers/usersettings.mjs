/**
 * User settings controller module
 * @module controllers/usersettings
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonschema from 'jsonschema'

import { newId } from '../../../lib/id.mjs'
import * as R from '../../../lib/response.mjs'
import * as actions from '../../../lib/action.mjs'
import DB from '../../../lib/db.mjs'

// Payload schema
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

    // Settings can be changed user only
    if ( req.user!==userid) {
      res.status(403).send(R.ko("Unauthorized"))
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

    actions.log(req.user, "read", "usersettings", userid)
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

    // Check user
    if ( req.user!==userid) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    // Validate payload
    const validate = jsonschema.validate(req.body, setSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
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

    actions.log(req.user, "create", "settings", userid)
    res.status(201).send(R.ok())
  } catch (err) {
    next(err)
  }
}
