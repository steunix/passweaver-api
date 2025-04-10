/**
 * Personal folders route module
 * @module routes/personal
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../lib/auth.mjs'
import * as personalController from '../controllers/personal.mjs'

const router = Router()

// Validation middleware
router.use(auth.validateJWT)

router.post('/unlock', personalController.unlock)

router.post('/password', personalController.setPassword)

router.patch('/password', personalController.updatePassword)

router.delete('/password', personalController.resetPassword)

export default router
