/**
 * Enterprise data route module
 * @module routes/edata
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../lib/auth.mjs'
import * as edataController from '../controllers/edata.mjs'

const router = Router({ mergeParams: true })

// Validation middleware
router.use(auth.validateJWT)

router.get('/', edataController.get)

router.post('/', edataController.create)

export default router
