'use strict'

const { T_BLOCK, T_CHAR, T_DIR, T_FILE, T_FIFO, T_SOCKET, T_SYMLINK } = require('./constants')

const functions = 'isFile isDirectory isSymbolicLink isBlockDevice isCharacterDevice isSocket isFIFO'
  .split(' ')
const types = [T_FILE, T_DIR, T_SYMLINK, T_BLOCK, T_CHAR, T_SOCKET, T_FIFO]

/** @returns {TDirEntry} */
const createEntry = (name, type, action) => ({ name, type, action, match: undefined })

/**
 * Translate native
 * @param {fs.Dirent} dirEntry
 * @returns {TDirEntry}
 */
const translateEntry = (dirEntry) => {
  const { name } = dirEntry
  let i = 0, fn

  try {
    while ((fn = functions[i]) !== undefined) {
      if (dirEntry[fn]()) return createEntry(name, types[i], undefined)
      i += 1
    }
  } catch (error) {     //  Todo: remove, when the has been in use for some time.
    error.dirEntry = dirEntry
    error.methodName = fn
    throw error
  }
  throw new Error(`directory entry '${name}' has no type`)
}

module.exports = { createEntry, translateEntry }
