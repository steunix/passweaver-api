/**
 * Events controller module
 * @module controllers/events
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonschema from 'jsonschema'

import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'

// Payload schemas
const createSchema = {
  "id": "create",
  "type": "object",
  "properties": {
    "event" : { "type": "numeric" },
    "entity" : { "type": "numeric" },
    "entityid": { "type": "string", "maxLength": 100 },
    "entityid2": { "type": "string", "maxLength": 100 }
  },
  "required": ["event", "entity", "entityid"]
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
      res.status(400).send(R.badRequest())
      return
    }

    await Events.add(
      req.user,
      req.body.event,
      req.body.entity,
      req.body.entityid,
      req.body.entityid2
    )

    res.status(200).send(R.ok())
  } catch (err) {
    next(err)
  }
}
