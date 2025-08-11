/**
 * API keys route module
 * @module routes/apikeys
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../lib/auth.mjs'
import * as apikeysController from '../controllers/apikeys.mjs'

const router = Router({ mergeParams: true })

// Validation middleware
router.use(auth.validateJWT)

router.get('/:id', apikeysController.get)

router.get('/', apikeysController.list)

router.post('/', apikeysController.create)

router.patch('/:id', apikeysController.update)

router.delete('/:id', apikeysController.remove)

export default router
