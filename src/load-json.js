/**
 * @module load-json
 */
'use strict'

const { readFileSync } = require('fs')

/**
 * Read something like package.json.
 *
 * @param {string|Buffer} source
 * @param {boolean} strict - do not ignore ENOENT.
 * @returns {undefined|Object}
 */
module.exports = (source, strict = false) => {
  try {
    const buffer = typeof source === 'string' ? readFileSync(source) : source
    return JSON.parse(buffer.toString())
  } catch (e) {
    if (e.code === 'ENOENT' && !strict) return undefined
    throw e
  }
}
