/**
 * Items route module
 * @module routes/items
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../lib/auth.mjs'
import * as itemsController from '../controllers/items.mjs'

const router = Router({ mergeParams: true })

// Validation middleware
router.use(auth.validateJWT)

router.get('/:id', itemsController.get)

router.get('/', itemsController.list)

router.post('/', itemsController.create)

router.patch('/:id', itemsController.update)

router.delete('/:id', itemsController.remove)

router.post('/:id/clone', itemsController.clone)

router.get('/:id/activity', itemsController.activity)

export default router
