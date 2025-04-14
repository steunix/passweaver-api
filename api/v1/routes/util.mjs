/**
 * Util route module
 * @module routes/util
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../lib/auth.mjs'
import * as utilController from '../controllers/util.mjs'

const router = Router()

// Validation middleware
router.use(auth.validateJWT)

router.get('/generatepassword', utilController.generatePassword)

router.get('/info', utilController.info)

router.post('/clearcache', utilController.clearCache)

router.get('/systemlock', utilController.systemGetLock)

router.post('/systemlock', utilController.systemLock)

router.post('/systemunlock', utilController.systemUnlock)

router.post('/systemreadonly', utilController.systemReadOnly)

router.post('/systemreadwrite', utilController.systemReadWrite)

router.get('/systemreadonly', utilController.systemGetReadOnly)

export default router
