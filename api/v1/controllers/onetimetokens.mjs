/**
 * One type tokens module
 * @module controllers/itemtypes
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonschema from 'jsonschema'

import { newId } from '../../../lib/id.mjs'
import * as R from '../../../lib/response.mjs'
import DB from '../../../lib/db.mjs'
import * as Crypt from '../../../lib/crypt.mjs'

// Payload schema
const createSchema = {
  "id": "create",
  "properties": {
    "data" : { "type": "string"},
    "hours": { "type": "numeric", "max": 24*7}
  },
  "required": ["data", "hours"]
}

/**
 * Decrypt and return a one time secret
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Error callback
 * @returns
 */
export async function get(req, res, next) {
  try {
    const id = req.params.id

    // Search token
    const ottoken = await DB.onetimetokens.findFirst({
      where: { token: id }
    })

    if ( ottoken===null ) {
      res.status(404).send(R.ko("Token not found"))
      return
    }

    const data = Crypt.decrypt(ottoken.data, ottoken.dataiv, ottoken.dataauthtag)

    // Delete token
    await DB.onetimetokens.deleteMany({
      where: { token: id }
    })

    res.status(200).send(R.ok(data))
  } catch (err) {
    next(err)
  }
}

/**
 * Create a one time token
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @returns
 */
export async function create(req, res, next) {
  try {
    // Validate payload
    const validate = jsonschema.validate(req.body, createSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    // Delete expired items
    await DB.onetimetokens.deleteMany({
      where: {
        expiresat: {
          lte: new Date()
        }
      }
    })

    // Creates the item type
    const newid = newId()
    const newToken = Crypt.randomString(20)
    const encData = Crypt.encrypt(req.body.data)
    const exp = new Date(Date.now() + req.body.hours * (60 * 60 * 1000) );

    await DB.onetimetokens.create({
      data: {
        id: newid,
        token: newToken,
        expiresat: exp,
        data: encData.encrypted,
        dataiv: encData.iv,
        dataauthtag: encData.authTag
      }
    })

    res.status(201).send(R.ok({token: newToken}))
  } catch (err) {
    next(err)
  }
}
