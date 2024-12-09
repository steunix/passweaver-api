/**
 * Groups route module
 * @module routes/groups
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../lib/auth.mjs'
import * as groupsController from '../controllers/groups.mjs'

const router = Router()

// Validation middleware
router.use(auth.validateJWT)

// Groups routes
router.get('/', groupsController.list)

router.get('/tree', groupsController.tree)

router.get('/:id', groupsController.get)

router.get('/:id/folders', groupsController.folders)

router.post('/:parent/groups', groupsController.create)

router.patch('/:id', groupsController.update)

router.delete('/:id', groupsController.remove)

router.get('/:id/users', groupsController.getUsers)

router.post('/:group/users/:user', groupsController.addUser)

router.delete('/:group/users/:user', groupsController.removeUser)

export default router
