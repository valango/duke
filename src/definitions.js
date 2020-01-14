/**
 * @module definitions
 */
'use strict'

//  DirEntry types.
const T_ANY = ''
const T_BLOCK = 'B'
const T_CHAR = 'C'
const T_DIR = 'd'
const T_FIFO = 'F'
const T_FILE = 'f'
const T_SOCKET = 'S'
const T_SYMLINK = 'L'

const S_BLOCK = 'blockDevice'
const S_CHAR = 'characterDevice'
const S_DIR = 'directory'
const S_FIFO = 'fifo'
const S_FILE = 'file'
const S_SOCKET = 'socket'
const S_SYMLINK = 'symLink'

const ts = {
  B: S_BLOCK,
  C: S_CHAR,
  d: S_DIR,
  F: S_FIFO,
  f: S_FILE,
  S: S_SOCKET,
  L: S_SYMLINK
}

exports = module.exports = {
  NIL: -1,

  //  Action types.
  A_NOPE: -4,
  A_SKIP: -3,
  A_EXCL: -2,       //  No match
  A_ABORT: -1,

  /* eslint-disable */
  S_BLOCK, S_CHAR, S_DIR, S_FIFO, S_FILE, S_SOCKET, S_SYMLINK,
  T_ANY, T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK,
  /* eslint-enable */

  typename: (t) => ts[t]
}
