'use strict'

const { DO_NOTHING, T_BLOCK, T_CHAR, T_DIR, T_FILE, T_FIFO, T_SOCKET, T_SYMLINK } =
        require('../constants')

const functions =
        'isFile isDirectory isSymbolicLink isBlockDevice isCharacterDevice isSocket isFIFO'
          .split(' ')
const types = [T_FILE, T_DIR, T_SYMLINK, T_BLOCK, T_CHAR, T_SOCKET, T_FIFO]

/** @returns {TDirEntry} */
const createDirEntry = (name, type, action = DO_NOTHING) => ({
  name,
  type,
  action,
  match: undefined
})

/**
 * Create from native Node.js fs.Dirent.
 * @param {fs.Dirent} dirEntry
 * @returns {TDirEntry}
 */
const fromDirEntry = (dirEntry) => {
  const { name } = dirEntry
  let i = 0, fn

  // try {
  while ((fn = functions[i]) !== undefined) {
    if (dirEntry[fn]()) return createDirEntry(name, types[i], undefined)
    i += 1
  }
  // } catch (error) {
  //   error.dirEntry = dirEntry
  //   error.methodName = fn
  //   throw error
  // }
  throw new Error(`directory entry '${name}' has no type`)
}

/**
 * Create from native Node.js fs.Dirent or from (name, type, action).
 * @param {...*} args
 * @returns {TDirEntry}
 */
exports = module.exports = (...args) => {
  return typeof args[0] === 'string' ? createDirEntry(...args) : fromDirEntry(args[0])
}

Object.assign(exports, { createDirEntry, fromDirEntry })
