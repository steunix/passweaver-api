/**
 * Response module
 * @module src/response
 */

/**
 * Returns a standard success response payload
 * @param {Object} data The data to be sent as response
 * @returns {Object} The payload
 */
export function ok(data) {
  return {
    status: "success",
    data: data ? data : {}
  }
}

/**
 * Returns a standard failure response payload
 * @param {string} message A description of the failure
 * @param {Object} data The optional data to be sent as response
 * @returns {Object} The payload
 */
export function ko(message, data) {
  return {
    status: "failed",
    message: message,
    data: data ? data : {}
  }
}
