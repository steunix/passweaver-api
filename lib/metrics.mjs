/**
 * Prometheus metrics module
 * @module lib/metrics
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as PromClient from 'prom-client'

const counters = {}

let enabled = false

/**
 * Initialize module
 */
export function init () {
  PromClient.collectDefaultMetrics()
  enabled = true
}

/**
 * Outputs metrics
 * @returns Metrics in flat format
 */
export async function output () {
  if (!enabled) {
    return ''
  }

  return await PromClient.register.metrics()
}

/**
 * Create a counter
 * @param {string} name Counter name
 * @param {string} help Counter help
 * @param {string} label Counter label (deprecated, use labelNames instead)
 * @param {string[]} labelNames Array of label names for Prometheus labels
 */
export function createCounter (name, help, label, labelNames) {
  if (!enabled) {
    return false
  }
  const key = `${name}/${label || ''}`
  if (labelNames && labelNames.length > 0) {
    counters[key] = new PromClient.Counter({ name, help, labelNames })
  } else {
    counters[key] = new PromClient.Counter({ name, help })
  }
}

/**
 * Increments counter
 * @param {string} name Counter name
 * @param {string} label Counter label (deprecated)
 * @param {object} labels Object with label values for Prometheus labels
 */
export function counterInc (name, label, labels) {
  if (!enabled) {
    return false
  }
  const key = `${name}/${label || ''}`
  const counter = counters[key]
  if (!counter) {
    return false
  }
  
  if (labels && typeof labels === 'object') {
    counter.inc(labels)
  } else {
    counter.inc()
  }
}
