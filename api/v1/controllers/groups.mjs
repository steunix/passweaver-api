/**
 * Groups controller module
 * @module controllers/groups
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import jsonschema from 'jsonschema'

import { newId } from '../../../lib/id.mjs'
import * as R from '../../../lib/response.mjs'
import * as actions from '../../../lib/action.mjs'
import * as Group from '../../../model/group.mjs'
import * as User from '../../../model/user.mjs'
import * as Cache from '../../../lib/cache.mjs'
import * as Auth from '../../../lib/auth.mjs'
import * as Const from '../../../lib/const.mjs'
import DB from '../../../lib/db.mjs'

// Payload schemas
const createSchema = {
  "id": "create",
  "type": "object",
  "properties": {
    "description" : { "type": "string", "maxLength": 100 }
  },
  "required": ["description"]
}
const updateSchema = {
  "id": "create",
  "type": "object",
  "properties": {
    "description" : { "type": "string", "maxLength": 100 },
    "parent" : { "type": "string", "maxLength": 30 }
  }
}

/**
 * Gets a group
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function get(req, res, next) {
  try {
    const id = req.params.id

    // Search folder
    const group = await DB.groups.findUnique({
      where: { id: id }
    });

    if ( group===null ) {
      res.status(404).send(R.ko("Group not found"))
      return
    }

    res.status(200).send(R.ok(group))
  } catch (err) {
    next(err)
  }
}

/**
 * Get groups list
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function list(req, res, next) {
  try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    const id = req.params.id

    // Search group
    var groups
    if ( req.query?.search ) {
      groups = await DB.groups.findMany({
        where: {
          description: { contains: req.query.search, mode: 'insensitive' }
        },
        orderBy: {
          description: "asc"
        }
      })
    } else {
      groups = await DB.groups.findMany({
        orderBy: {
          description: "asc"
        }
      })
    }

    res.status(200).send(R.ok(groups))
  } catch (err) {
    next(err)
  }
}

/**
 * Get group members
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 */
export async function getUsers(req, res, next) {
  try {
    const id = req.params.id

    var data = []

    // Search group members
    const users = await DB.groupsmembers.findMany({
      where: { groupid: id },
      select: {
        users: {
          select: {
            id: true,
            login: true,
            lastname: true,
            firstname: true,
            locale: true,
            authmethod: true,
            active: true,
            createdat: true,
            updatedat: true
          }
        }
      },
      orderBy: {
        users: {
          lastname: "asc"
        }
      }
    })

    // FIXME: is this loop necessary? Why not sending users directly?
    for ( const user of users ) {
      data.push(user.users)
    }
    res.status(200).send(R.ok(data))
  } catch (err) {
    next(err)
  }
}

/**
 * Create a group
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function create(req, res, next) {
    try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    // Validate payload
    const validate = jsonschema.validate(req.body, createSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    // Search parent
    if ( !await Group.exists(req.params.parent) ) {
      res.status(404).send(R.ko("Parent group not found"))
      return
    }

    if ( req.params.parent==Const.PW_GROUP_EVERYONEID ) {
      res.status(422).send(R.ko("Cannot create groups in Everyone group"))
      return
    }

    // Creates group
    const newid = newId()
    await DB.groups.create({
      data: {
        id: newid,
        description: req.body.description,
        parent: req.params.parent
      }
    })

    // Tree cache doesn't need to be reset, because the group is empty
    actions.log(req.user, "create", "group", newid)

    await Cache.resetGroupsTree()
    res.status(201).send(R.ok({id:newid}))
  } catch (err) {
    next(err)
  }
}

/**
 * Update a group
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */

export async function update(req, res, next) {
    try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    // Validate payload
    const validate = jsonschema.validate(req.body, updateSchema)
    if ( !validate.valid ) {
      res.status(400).send(R.ko("Bad request"))
      return
    }

    const id = req.params.id

    // Check for root group
    if ( id==Const.PW_GROUP_ROOTID ) {
      res.status(422).send(R.ko("Root group cannot be modified"))
      return;
    }

    // Check for Admins group
    if ( id==Const.PW_GROUP_ADMINSID ) {
      res.status(422).send(R.ko("Admins group cannot be modified"))
      return;
    }

    // Check for Everyone group
    if ( id==Const.PW_GROUP_EVERYONEID ) {
      res.status(422).send(R.ko("Everyone group cannot be modified"))
      return;
    }

    // Search group
    if ( !await Group.exists(id) ) {
      res.status(404).send(R.ko("Group not found"))
      return
    }

    const groupFromURL = req.params.parent || req.body.parent

    // Search parent group
    if ( groupFromURL ) {
      if ( !await Group.exists(groupFromURL) ) {
        res.status(404).send(R.ko("Parent group not found"))
        return
      }

      // New parent cannot be one of its current children, otherwise it would break the tree
      const group = await DB.groups.findUnique({
        where: { id: id}
      })

      const children = await Group.children(group.id)
      if ( children.find( (elem)=> { return elem.id == req.body.parent} ) ) {
        res.status(422).send(R.ko("Parent group is invalid"))
        return
      }
    }

    let updateStruct = {}
    if ( req.body.description ) {
      updateStruct.description = req.body.description
    }
    if ( groupFromURL ) {
      updateStruct.parent = groupFromURL
    }

    // Update group
    await DB.groups.update({
      data: updateStruct,
      where: {
        id: id
      }
    })

    actions.log(req.user, "update", "group", id)
    await Cache.resetFoldersTree()
    await Cache.resetGroupsTree()
    res.status(200).send(R.ok())
  } catch (err) {
    next(err)
  }
}

/**
 * Delete a group
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */

export async function remove(req, res, next) {
  try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    const id = req.params.id

    // Root group cannot be deleted
    if ( id==Const.PW_GROUP_ROOTID ) {
      res.status(422).send(R.ko("Root group cannot be deleted"))
      return
    }

    // Everyone group cannot be deleted
    if ( id==Const.PW_GROUP_EVERYONEID ) {
      res.status(422).send(R.ko("Root group cannot be deleted"))
      return
    }

    // Everyone group cannot be deleted
    if ( id==Const.PW_GROUP_ADMINSID ) {
      res.status(422).send(R.ko("Admins group cannot be deleted"))
      return
    }

    // Gets the group
    if ( !await Group.exists(id) ) {
      res.status(404).send(R.ko("Group not found"))
      return
    }

    // Looks for children groups
    const children = await DB.groups.findFirst({
      where: { parent: id }
    })
    if ( children!==null ) {
      res.status(422).send(R.ko("Group not empty"))
      return
    }

    // FIXME: use transaction
    // Delete user/groups
    await DB.groupsmembers.deleteMany({
      where: {
        groupid: id
      }
    })

    // Delete folder/groups
    await DB.folderspermissions.deleteMany({
      where: {
        groupid: id
      }
    })

    // Delete group
    await DB.groups.delete({
      where: {
        id: id
      }
    })

    actions.log(req.user, "delete", "group", id)
    await Cache.resetFoldersTree()
    await Cache.resetGroupsTree()
    res.status(200).send(R.ok())
  } catch (err) {
    next(err)
  }
}

/**
 * Adds a user to a group
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function addUser(req, res, next) {
  try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    const group = req.params.group
    const user = req.params.user

    // Checks the group
    if ( !await Group.exists(group) ) {
      res.status(404).send(R.ko("Group not found"))
      return
    }

    // Cannot add user to Everyone
    if ( group==Const.PW_GROUP_EVERYONEID ) {
      res.status(422).send(R.ko("Cannot add users to Everyone group"))
      return
    }

    // Checks the user
    if ( !await User.exists(user) ) {
      res.status(404).send(R.ko("User not found"))
      return
    }

    // Checks if already associated
    const ex = await DB.groupsmembers.findFirst({
      where: {
        groupid: group,
        userid: user
      }
    })
    if ( ex!==null ) {
      res.status(422).send(R.ko("User is already in the group"))
      return
    }

    const newid = newId()
    await DB.groupsmembers.create({
      data: {
        id: newid,
        groupid: group,
        userid: user
      }
    })

    actions.log(req.user, "add", "groupsmembers", `${group}/${user}`)

    await Cache.resetFoldersTree(user)
    res.status(200).send(R.ok())
  } catch (err) {
    next(err)
  }
}

/**
 * Remove a user from a group
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function removeUser(req, res, next) {
  try {
    // Must be admin
    if ( !await Auth.isAdmin(req) ) {
      res.status(403).send(R.ko("Unauthorized"))
      return
    }

    const group = req.params.group
    const user = req.params.user

    // Checks the group
    if ( !await Group.exists(group) ) {
      res.status(404).send(R.ko("Group not found"))
      return
    }

    // Checks the user
    if ( !await User.exists(user) ) {
      res.status(404).send(R.ko("User not found"))
      return
    }

    // Admin cannot be removed from Admins
    if ( group==Const.PW_GROUP_ADMINSID && user==Const.PW_USER_ADMINID ) {
      res.status(422).send(R.ko("Admin cannot be removed from Admins group"))
      return
    }

    // Cannot remove user from Everyone
    if ( group==Const.PW_GROUP_EVERYONEID ) {
      res.status(422).send(R.ko("Cannot remove users from Everyone group"))
      return
    }

    // Checks if associated
    const ex = await DB.groupsmembers.findFirst({
      where: {
        groupid: group,
        userid: user
      }
    })
    if ( ex==null ) {
      res.status(422).send(R.ko("User is not in the group"))
      return
    }

    await DB.groupsmembers.delete({
      where: {
        id: ex.id
      }
    })

    actions.log(req.user, "delete", "groupsmembers", `${group}/${user}`)

    await Cache.resetFoldersTree(user)
    res.status(200).send(R.ok())
  } catch (err) {
    next(err)
  }
}

/**
 * Get the tree structure of groups
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Express next callback
 * @returns
 */
export async function tree(req, res, next) {
  try {
    const tree = await Group.tree(req.user);
    res.status(200).send(R.ok(tree))
  } catch (err) {
    next(err)
  }
}
