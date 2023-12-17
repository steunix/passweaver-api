/**
 * Login route module
 * @module routes/login
 */

import { Router } from 'express'

import * as loginController from '../controllers/login.mjs'

const router = Router()

router.post("/", loginController.login)

export default router