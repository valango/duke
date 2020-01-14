/**
 * @module constants
 */
'use strict'

module.exports = {
  NIL: -1,

  //  Action types.
  A_NOPE: 0,
  A_SKIP: 1,
  A_EXCL: 2,
  A_ABORT: 3,

  //  DirEntry types.
  T_BLOCK: 'blockDevice',
  T_CHAR: 'characterDevice',
  T_DIR: 'directory',
  T_FIFO: 'fifo',
  T_FILE: 'file',
  T_SOCKET: 'socket',
  T_SYMLINK: 'symLink'
}
