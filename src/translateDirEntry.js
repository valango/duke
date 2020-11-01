'use strict'

const { T_BLOCK, T_CHAR, T_DIR, T_FILE, T_FIFO, T_SOCKET, T_SYMLINK } = require('./constants')

const functions = 'isFile isDirectory isSymbolicLink iBlockDevice isCharDevice isSocket isFIFO'
  .split(' ')
const types = [T_FILE, T_DIR, T_SYMLINK, T_BLOCK, T_CHAR, T_SOCKET, T_FIFO]

/**
 * @param {fs.Dirent} dirEntry
 * @returns {Object}  type constant
 */
module.exports = (dirEntry) => {
  const { name } = dirEntry

  for (let i = 0, fn; (fn = functions[i]) !== undefined; i += 1) {
    if (dirEntry[fn]()) return { name, type: types[i] }
  }
  throw new Error(`directory entry '${name}' has no type`)
}
