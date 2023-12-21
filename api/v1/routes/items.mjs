/**
 * Items route module
 * @module routes/items
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../src/auth.mjs'
import * as itemsController from '../controllers/items.mjs'

const router = Router({mergeParams:true})

// Validation middleware
router.use(auth.validateJWT)

router.get('/:id', itemsController.get)

router.get('/', itemsController.list)

router.patch("/", itemsController.create)

router.put("/:id", itemsController.update)

router.delete("/:id", itemsController.remove)

export default router