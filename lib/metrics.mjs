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
 * @param {string} label Counter label
 */
export function createCounter (name, help, label) {
  if (!enabled) {
    return false
  }
  counters[`${name}/${label || ''}`] = new PromClient.Counter({ name, help })
}

/**
 * Increments counter
 * @param {string} name Counter name
 * @param {string} label Counter label
 */
export function counterInc (name, label) {
  if (!enabled) {
    return false
  }
  counters[`${name}/${label || ''}`].inc()
}
