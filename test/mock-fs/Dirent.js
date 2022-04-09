/**
 * @module stubs/fs/Dirent
 * @version 1.0.0
 */
'use strict'
const assert = require('assert')
const { T_BLOCK, T_CHAR, T_DIR, T_FILE, T_FIFO, T_SOCKET, T_SYMLINK, checkDirEntryType } =
        require('../..')

class DirEntry {
  constructor (name, type) {
    assert(name && typeof name === 'string', `Dirent: bad name '${name}'`)

    this._type = checkDirEntryType(type)
    this.name = name
  }

  isBlockDevice () {
    return this._type === T_BLOCK
  }

  isCharacterDevice () {
    return this._type === T_CHAR
  }

  isDirectory () {
    return this._type === T_DIR
  }

  isFIFO () {
    return this._type === T_FIFO
  }

  isFile () {
    return this._type === T_FILE
  }

  isSocket () {
    return this._type === T_SOCKET
  }

  isSymbolicLink () {
    return this._type === T_SYMLINK
  }
}

const factory = (name, type = T_FILE) => new DirEntry(name, type)

module.exports = factory
