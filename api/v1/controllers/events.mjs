/**
 * Events controller module
 * @module controllers/events
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonschema from 'jsonschema'

import * as R from '../../../lib/response.mjs'
import * as Action from '../../../lib/action.mjs'

// Payload schemas
const createSchema = {
  "id": "create",
  "type": "object",
  "properties": {
    "event" : { "type": "string", "maxLength": 50 },
    "itemtype" : { "type": "string", "maxLength": 20 },
    "itemid": { "type": "string", "maxLength": 100 }
  },
  "required": ["event", "itemtype", "itemid"]
}

/**
 * Store an event
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {function} next Next
 */
export async function create(req, res, next) {

  try {
    // Validate payload
    const validate = jsonschema.validate(req.body, createSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    await Action.log(
      req.user,
      req.body.event,
      req.body.itemtype,
      req.body.itemid
    )

    res.status(200).send(R.ok())
  } catch (err) {
    next(err)
  }
}
