/**
 * Util route module
 * @module routes/util
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as auth from '../../../lib/auth.mjs'
import * as utilController from '../controllers/util.mjs'

const router = Router()

// Validation middleware
router.use(auth.validateJWT)

router.get("/generatepassword", utilController.generatePassword)

router.get("/info", utilController.info)

export default router