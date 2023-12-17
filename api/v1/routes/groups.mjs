/**
 * Groups route module
 * @module routes/groups
 */

import { Router } from 'express'

import * as auth from '../../../src/auth.mjs'
import * as groupsController from '../controllers/groups.mjs'

const router = Router()

// Validation middleware
router.use(auth.validateJWT)

// Groups routes
router.get('/:id', groupsController.get)

router.post("/:parent/", groupsController.create)

router.put("/:id", groupsController.update)

router.delete("/:id", groupsController.remove)

router.post('/:group/users/:user', groupsController.addUser)

router.delete('/:group/users/:user', groupsController.removeUser)

router.get('/util/tree', groupsController.tree)

export default router