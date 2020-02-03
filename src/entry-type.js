/**
 * Used by Walker.js
 * @module entry-type
 */
'use strict'

const
  { T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK } =
    require('./definitions')

const types = {
  isBlockDevice: T_BLOCK,
  isCharacterDevice: T_CHAR,
  isDirectory: T_DIR,
  isFIFO: T_FIFO,
  isFile: T_FILE,
  isSocket: T_SOCKET,
  isSymbolicLink: T_SYMLINK
}

/**
 * Get DirEntry type.
 *
 * @param entry
 * @returns {string}
 */
module.exports = (entry) => {
  for (const test of Object.keys(types)) {
    if (entry[test]()) return types[test]
  }
}
