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

const CONTINUE = -1
const DISCLAIM = 0
const DO_SKIP = Number.MAX_SAFE_INTEGER - 2
const DO_ABORT = Number.MAX_SAFE_INTEGER - 1
const DO_TERMINATE = Number.MAX_SAFE_INTEGER

/**
 * type {Object}
 */
exports = module.exports = {
  //  Internal constants.
  /** @member {null} GLOB  glob rule. */
  GLOB: null,
  /** @member {number} NIL   Index pointing to nowhere. */
  NIL: -1,
  /** @member {number} ROOT  index of root glob rule node. */
  ROOT: 0,

  //  Action codes. DISCLAIM can not be used in rule definitions!
  /** @member {number} CONTINUE  reserved for Ruler: partial match. */
  CONTINUE,
  /** @member {number} DISCLAIM  reserved for Ruler: no match or discard any. */
  DISCLAIM,
  /** @member {number} DO_SKIP      Ignore this item. */
  DO_SKIP,
  /** @member {number} DO_ABORT     Discard all matches, jump one level up. */
  DO_ABORT,
  /** @member {number} DO_TERMINATE Terminate any walking. */
  DO_TERMINATE,
  //  Application may define it's own codes starting from DO_DEFAULT.

  /* eslint-disable */
  //  DirEntry type codes.
  T_ANY, T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK,
  /* eslint-enable */

  /**
   * Directory entry type codes.
   * @type {Array<string>}
   */
  entryTypes: [T_ANY, T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK],

  /**
   * Translate DirEntry type to human-readable type name.
   * @param {string} type
   * @returns {string | undefined}
   */
  typeName: (type) => _ts[type]
}
