/**
 * Events route module
 * @module routes/events
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../lib/auth.mjs'
import * as eventsController from '../controllers/events.mjs'

const router = Router()

// Validation middleware
router.use(auth.validateJWT)

router.post('/', eventsController.create)

export default router
