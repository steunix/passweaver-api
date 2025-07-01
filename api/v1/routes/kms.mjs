/**
 * KMS route module
 * @module routes/kms
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../lib/auth.mjs'
import * as kmsController from '../controllers/kms.mjs'

const router = Router({ mergeParams: true })

// Validation middleware
router.use(auth.validateJWT)

router.get('/:id', kmsController.get)

router.get('/', kmsController.list)

router.post('/', kmsController.create)

router.patch('/:id', kmsController.update)

router.delete('/:id', kmsController.remove)

export default router
