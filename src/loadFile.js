'use strict'

const { readFileSync } = require('fs')

/**
 * Read file synchronously; suppressing missing file (ENOENT) error.
 *
 * @param {string} filePath
 * @param {boolean} mildly - return error object instead of throwing it.
 * @returns {undefined|Buffer}
 */
const loadFile = (filePath, mildly = false) => {
  try {
    return readFileSync(filePath)
  } catch (e) {
    if (e.code === 'ENOENT') return undefined
    if (mildly) return e
    throw e
  }
}

module.exports = loadFile
