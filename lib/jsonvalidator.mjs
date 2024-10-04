/**
 * JSON schema validator module
 * @module lib/jsonvalidator
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2024 - Stefano Rivoir <rs4000@gmail.com>
 */

import Ajv from 'ajv'
import { readFileSync } from 'fs'

const AJV = new Ajv()

/**
 * Validate an object against its schema. Load the schema from disk if it's not already cached
 * @param {Object} json Object to validate
 * @param {string} schema Schema name
 */
export function validate (json, schema) {
  try {
    // Check if schema is in AJV cache
    const compiled = AJV.getSchema(schema)
    if (!compiled) {
      const newschema = JSON.parse(
        readFileSync(
          new URL(`./schemas/${schema}.json`, import.meta.url)
        )
      )

      AJV.addSchema(newschema, schema)
    }

    const res = AJV.validate(schema, json)
    return res
  } catch (err) {
    return false
  }
}

/**
 * Return last validation errors
 * @returns Validation errors
 */
export function errors () {
  let err = ''
  for (const error of AJV.errors) {
    err += error.message + '\n'
  }
  return err
}
