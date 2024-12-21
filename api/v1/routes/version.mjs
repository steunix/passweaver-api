/**
 * Version route module
 * @module routes/version
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as versionController from '../controllers/version.mjs'

const router = Router()

router.get('/', versionController.version)

export default router
