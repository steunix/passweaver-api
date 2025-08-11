/**
 * Metrics route module
 * @module routes/metrics
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { Router } from 'express'

import * as metricsController from '../controllers/metrics.mjs'

const router = Router()

router.get('/', metricsController.metrics)

export default router
