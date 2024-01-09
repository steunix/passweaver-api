/**
 * Users route module
 * @module routes/users
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../src/auth.mjs'
import * as usersController from '../controllers/users.mjs'

const router = Router()

// Validation middleware
router.use(auth.validateJWT)

router.get("/", usersController.list)

router.get('/:id', usersController.get)

router.post("/", usersController.create)

router.patch("/:id", usersController.update)

router.delete("/:id", usersController.remove)

router.get('/:id/groups', usersController.getGroups)

export default router