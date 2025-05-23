/**
 * Login route module
 * @module routes/login
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as loginController from '../controllers/login.mjs'

const router = Router()

router.post('/', loginController.login)

export default router
