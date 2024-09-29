/**
 * Response module
 * @module lib/response
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

export const CREATED = 201
export const BAD_REQUEST = 400
export const UNAUTHORIZED = 401
export const NOT_FOUND = 404
export const FORBIDDEN = 403
export const PRECONDITION_FAILED = 412
export const EXPECTATION_FAILED = 417
export const UNPROCESSABLE_ENTITY = 422
export const INTERNAL_SERVER_ERROR = 500

/**
 * Returns a standard success response payload
 * @param {Object} data The data to be sent as response
 * @returns {Object} The payload
 */
export function ok (data) {
  return {
    status: 'success',
    data: data || {}
  }
}

/**
 * Returns a standard failure response payload
 * @param {string} message A description of the failure
 * @param {Object} data The optional data to be sent as response
 * @returns {Object} The payload
 */
export function ko (message, data) {
  return {
    status: 'failed',
    message,
    data: data || {}
  }
}

/**
 * Returns a standard 'bad data' response payload
 * @param {Object} data The optional data to be sent as response
 * @returns
 */
export function forbidden (data) {
  return ko('Forbidden', data)
}

/**
 * Returns a standard 'bad request' response payload
 * @param {Object} data The optional data to be sent as response
 * @returns
 */
export function badRequest (data) {
  return ko('Bad request', data)
}
