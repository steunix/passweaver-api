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
 * @param {string} label Counter label (for single label use)
 * @param {string[]} labelNames Array of label names for Prometheus labels
 */
export function createCounter (name, help, label, labelNames) {
  if (!enabled) {
    return false
  }
  const key = `${name}/${label || ''}`
  if (labelNames && labelNames.length > 0) {
    counters[key] = new PromClient.Counter({ name, help, labelNames })
  } else if (label && label.length > 0) {
    // Support for single label
    counters[key] = new PromClient.Counter({ name, help, labelNames: [label] })
  } else {
    counters[key] = new PromClient.Counter({ name, help })
  }
}

/**
 * Increments counter
 * @param {string} name Counter name
 * @param {string} labelValue Counter label value (for single label use) or deprecated label
 * @param {object} labels Object with label values for Prometheus labels
 */
export function counterInc (name, labelValue, labels) {
  if (!enabled) {
    return false
  }
  
  // For single label counters, we need to find the counter by its label name, not value
  // First, try to find a counter with no label (old style)
  let key = `${name}/`
  let counter = counters[key]
  
  if (!counter) {
    // Look for counters with single labels
    for (const counterKey in counters) {
      if (counterKey.startsWith(`${name}/`) && counterKey !== `${name}/`) {
        counter = counters[counterKey]
        key = counterKey
        break
      }
    }
  }
  
  if (!counter) {
    return false
  }
  
  if (labels && typeof labels === 'object') {
    counter.inc(labels)
  } else if (labelValue && labelValue.length > 0) {
    // Support for single label value
    const labelName = key.split('/')[1] // Extract label name from key
    if (labelName) {
      const labelObject = {}
      labelObject[labelName] = labelValue
      counter.inc(labelObject)
    } else {
      counter.inc()
    }
  } else {
    counter.inc()
  }
}
