/**
 * Metrics module
 * @module controllers/metrics
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @license MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as Metrics from '../../../lib/metrics.mjs'

/**
 * Expose Prometheus metrics
 */
export async function metrics (req, res, next) {
  const out = await Metrics.output()
  res.status(200)
  res.send(out)
}
