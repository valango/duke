/**
 * @module load-file
 */
'use strict'

const { readFileSync } = require('fs')

/**
 * Read file synchronously; suppressing missing file (ENOENT) error.
 *
 * @param {string} filePath
 * @param {boolean} strict - do not ignore ENOENT.
 * @returns {undefined|Buffer}
 */
module.exports = (filePath, strict = false) => {
  try {
    return readFileSync(filePath)
  } catch (e) {
    if (e.code === 'ENOENT' && !strict) return undefined
    throw e
  }
}
