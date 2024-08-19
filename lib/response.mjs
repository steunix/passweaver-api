/**
 * Response module
 * @module lib/response
 * @author Stefano Rivoir <rs4000@gmail.com>
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

/**
 * Returns a standard "bad data" response payload
 * @param {Object} data The optional data to be sent as response
 * @returns
 */
export function forbidden(data) {
  return ko("Forbidden", data)
}

/**
 * Returns a standard "bad request" response payload
 * @param {Object} data The optional data to be sent as response
 * @returns
 */
export function badRequest(data) {
  return ko("Bad request", data)
}
