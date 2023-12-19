/**
 * User controller module
 * @module controllers/users
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaClient } from '@prisma/client'
import jsonschema from 'jsonschema'

import { randomId } from '../../../src/random.mjs'
import * as R from '../../../src/response.mjs'
import * as actions from '../../../src/action.mjs'
import * as Config from '../../../src/config.mjs'
import * as Auth from '../../../src/auth.mjs'
import * as Crypt from '../../../src/crypt.mjs'

const prisma = new PrismaClient(Config.get().prisma_options)

// Payload schema
const schema = {
  "id": "/users",
  "type": "object",
  "properties": {
    "login" : { "type": "string" },
    "description" : { "type": "string" },
    "email" : { "type": "string" },
    "secret" : { "type": "string" }
  },
  "required": ["login", "description","email","secret"]
}

/**
 * Get a user
 * @param {string} user
 * @param {string} userlogin
 * @returns {string} A JWT
 */
export async function get(req, res) {
  const id = req.params.id

  // Search user
  const user = await prisma.users.findUnique({
    where: { id: id },
    select: {
      id: true,
      login: true,
      description: true,
      email: true,
      active: true,
      createdat: true,
      updatedat: true
    }
  });

  if ( user===null ) {
    res.status(404).send(R.ko("User not found"))
    return
  }

  res.status(200).send(R.ok(user))
}

/**
 * Create a user
 * @param {string} user
 * @param {string} userlogin
 * @returns {string} A JWT
 */
export async function create(req, res) {
  // Must be admin
  if ( !await Auth.isAdmin(req) ) {
    res.status(403).send(R.ko("Unauthorized"))
    return
  }

  // Validate payload
  const validate = jsonschema.validate(req.body, schema)
  if ( !validate.valid ) {
    res.status(400).send(R.ko("Bad request"))
    return
  }

  // Creates user
  const newid = randomId()
  const hash = await Crypt.hashPassword(req.body.secret)
  await prisma.users.create({
    data: {
      id: newid,
      login: req.body.login,
      description: req.body.description,
      email: req.body.email,
      secret: hash,
      secretexpiresat: new Date(2050,12,31,23,59,59)
    }
  })

  // Creates personal folder
  const newFolderId = randomId()
  await prisma.folders.create({
    data: {
      id: newFolderId,
      description: req.body.description,
      parent: "P",
      personal: true,
      user: newid
    }
  })

  actions.log(req.user, "create", "user", newid)
  res.send(R.ok({id: newid}))
}

/**
 * Update a user
 * @param {string} user
 * @param {string} userlogin
 * @returns {string} A JWT
 */
export async function update(req, res) {
  // Must be admin
  if ( !await Auth.isAdmin(req) ) {
    res.status(403).send(R.ko("Unauthorized"))
    return
  }

  // Validate payload
  const validate = jsonschema.validate(req.body, schema)
  if ( !validate.valid ) {
    res.status(400).send(R.ko("Bad request"))
    return
  }

  const id = req.params.id

  // Search user
  const user = await prisma.users.findUnique({
    where: { id: id }
  });

  if ( user===null ) {
    res.status(404).send(R.ko("User not found"))
    return
  }

  // Updates
  const hash = Crypt.hashPassword(req.body.secret)
  await prisma.users.update({
    data: {
      login: req.body.login,
      description: req.body.description,
      email: req.body.email,
      secret: hash,
      secretexpiresat: new Date(2050,12,31,23,59,59)
    },
    where: {
      id: id
    }
  })

  actions.log(req.user, "update", "user", id)
  res.send(R.ok())
}

/**
 * Delete a user
 * @param {string} user
 * @param {string} userlogin
 * @returns {string} A JWT
 */
export async function remove(req, res) {
  // Must be admin
  if ( !await Auth.isAdmin(req) ) {
    res.status(403).send(R.ko("Unauthorized"))
    return
  }

  const id = req.params.id

  // Search user
  const user = await prisma.users.findUnique({
    where: { id: id }
  });

  if ( user===null ) {
    res.status(404).send(R.ko("User not found"))
    return
  }

  // Search user
  const personal = await prisma.folders.findMany({
    where: { personal: true, user: id }
  });
  const personalId = personal[0].id

  prisma.$transaction(async(tx)=> {
    // Deletes user groups
    await prisma.usersGroups.deleteMany({
      where: { user: id }
    })

    // Deletes user
    await prisma.users.delete({
      where: { id: id }
    })

    // Deletes items in personal folder
    await prisma.items.deleteMany({
      where: { folder: personalId }
    })

    // Deletes personal folder
    await prisma.folders.delete({
      where: { id: personalId }
    })
  })

  actions.log(req.user, "delete", "folder", id)
  res.send(R.ok('Done'))
}