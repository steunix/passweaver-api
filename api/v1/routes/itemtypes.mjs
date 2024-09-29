/**
 * Item types route module
 * @module routes/itemtypes
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../lib/auth.mjs'
import * as itemTypesController from '../controllers/itemtypes.mjs'

const router = Router({ mergeParams: true })

// Validation middleware
router.use(auth.validateJWT)

router.get('/:id', itemTypesController.get)

router.get('/', itemTypesController.list)

router.post('/', itemTypesController.create)

router.patch('/:id', itemTypesController.update)

router.delete('/:id', itemTypesController.remove)

export default router
