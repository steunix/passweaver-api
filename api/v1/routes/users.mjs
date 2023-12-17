/**
 * Users route module
 * @module routes/users
 */

import { Router } from 'express'

import * as auth from '../../../src/auth.mjs'
import * as usersController from '../controllers/users.mjs'

const router = Router()

// Validation middleware
router.use(auth.validateJWT)

router.get('/:id', usersController.get)

router.post("/", usersController.create)

router.put("/:id", usersController.update)

router.delete("/:id", usersController.remove)

export default router