/**
 * Folders route module
 * @module routes/folders
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../src/auth.mjs'
import * as foldersController from '../controllers/folders.mjs'
import itemsRouter from './items.mjs'

const router = Router({mergeParams:true})

// Validation middleware
router.use(auth.validateJWT)

// Items router
router.use("/:folder/items", itemsRouter)

// Folders routes
router.get('/:id', foldersController.get)

router.get('/:id/groups', foldersController.groups)

router.post("/:parent/folders/", foldersController.create)

router.patch("/:id", foldersController.update)

router.delete("/:id", foldersController.remove)

router.get('/util/tree', foldersController.tree)

router.post("/:folder/groups/:group", foldersController.addGroup)

router.delete("/:folder/groups/:group", foldersController.removeGroup)

router.patch("/:folder/groups/:group", foldersController.setGroup)

export default router