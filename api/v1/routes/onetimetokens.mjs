/**
 * One time tokens module
 * @module routes/onetimetokens
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'
import * as auth from '../../../lib/auth.mjs'

import * as oneTimeTokensController from '../controllers/onetimetokens.mjs'

const router = Router({ mergeParams: true })

// Validation middleware
router.use(/\/$/, auth.validateJWT)

router.post('/', oneTimeTokensController.create)

router.get('/:id', oneTimeTokensController.get)

export default router
