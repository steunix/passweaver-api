/**
 * One time tokens module
 * @module routes/onetimetokens
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as oneTimeTokensController from '../controllers/onetimetokens.mjs'

const router = Router({mergeParams:true})

router.post('/', oneTimeTokensController.create)

router.get('/:id', oneTimeTokensController.get)

export default router