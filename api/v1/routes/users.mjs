/**
 * Users route module
 * @module routes/users
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../lib/auth.mjs'
import * as usersController from '../controllers/users.mjs'
import * as userSettingsController from '../controllers/usersettings.mjs'

const router = Router()

// Validation middleware
router.use(auth.validateJWT)

router.get('/', usersController.list)

router.get('/:id', usersController.get)

router.post('/', usersController.create)

router.patch('/:id', usersController.update)

router.delete('/:id', usersController.remove)

router.get('/:id/groups', usersController.getGroups)

router.get('/:id/settings', userSettingsController.get)

router.post('/:id/settings', userSettingsController.set)

router.get('/:id/activity', usersController.activity)

export default router
