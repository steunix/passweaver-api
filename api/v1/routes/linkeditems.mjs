/**
 * Linked items route module
 * @module routes/linkeditems
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../lib/auth.mjs'
import * as linkedItemsController from '../controllers/linkeditems.mjs'

const router = Router({ mergeParams: true })

// Validation middleware
router.use(auth.validateJWT)

router.post('/', linkedItemsController.create)

export default router
