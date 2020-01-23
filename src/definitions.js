/**
 * @module definitions
 */
'use strict'

//  DirEntry type codes.
const T_ANY = ''
const T_BLOCK = 'B'
const T_CHAR = 'C'
const T_DIR = 'd'
const T_FIFO = 'F'
const T_FILE = 'f'
const T_SOCKET = 'S'
const T_SYMLINK = 'L'

const _ts = {
  [T_BLOCK]: 'blockDevice',
  [T_CHAR]: 'characterDevice',
  [T_DIR]: 'directory',
  [T_FIFO]: 'fifo',
  [T_FILE]: 'file',
  [T_SOCKET]: 'socket',
  [T_SYMLINK]: 'symLink'
}

/**
 * type {Object}
 */
exports = module.exports = {
  //  Internal constants.
  /** @member {number} GLOB  Used in rule tree. */
  GLOB: null,
  /** @member {number} NIL   Index pointing to nowhere. */
  NIL: -1,

  //  Action codes. Negative values are reserved.
  //  Application may define it's own codes starting from DO_DEFAULT.
  /** @member {number} DO_TERMINATE Terminate any walking. */
  DO_TERMINATE: -5,
  /** @member {number} DO_CONTINUE  Possibly partial match, keep going. */
  DO_CONTINUE: -4,
  /** @member {number} DO_DISCARD   Discard all matches. */
  DO_DISCARD: -3,
  /** @member {number} DO_SKIP      Ignore this item. */
  DO_SKIP: -2,
  /** @member {number} DO_ABORT     Discard all matches, jump one level up. */
  DO_ABORT: -1,
  /** @member {number} DO_DEFAULT   Default action (0). */
  DO_DEFAULT: 0,

  /* eslint-disable */
  //  DirEntry type codes.
  T_ANY, T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK,
  /* eslint-enable */

  /**
   * Translate DirEntry type to human-readable type name.
   * @param {string} type
   * @returns {string | undefined}
   */
  typeName: (type) => _ts[type]
}
