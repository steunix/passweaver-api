/**
 * Events controller module
 * @module controllers/events
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import * as R from '../../../lib/response.mjs'
import * as Events from '../../../lib/event.mjs'
import * as JV from '../../../lib/jsonvalidator.mjs'

/**
 * Store an event
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {function} next Next
 */
export async function create(req, res, next) {
  // Validate payload
  if ( !JV.validate(req.body, "event_create")) {
    res.status(R.BAD_REQUEST).send(R.badRequest())
    return
  }

  await Events.add(
    req.user,
    req.body.event,
    req.body.entity,
    req.body.entityid,
    req.body.entityid2
  )

  res.status(201).send(R.ok())
}
