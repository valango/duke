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

const CONTINUE = -2
const DISCLAIM = -1
const DO_SKIP = Number.MAX_SAFE_INTEGER - 2
const DO_ABORT = Number.MAX_SAFE_INTEGER - 1
const DO_TERMINATE = Number.MAX_SAFE_INTEGER

const _aCodes = [CONTINUE, DISCLAIM, DO_SKIP, DO_ABORT, DO_TERMINATE]
const _aNames = [
  'CONTINUE', 'DISCLAIM', 'DO_SKIP', 'DO_ABORT', 'DO_TERMINATE'
]

/**
 * type {Object}
 */
exports = module.exports = {
  //  Internal constants.
  /** @member {number} ACT   action code index in Ruler.match() record. */
  ACT: 2,
  /** @member {null} GLOB  glob rule. */
  GLOB: null,
  /** @member {number} NIL   Index pointing to nowhere. */
  NIL: -1,
  /** @member {number} ROOT  index of root glob rule node. */
  ROOT: 0,

  //  Action codes. Negative values are reserved.
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
   * Translate action code to human-readable string. For diagnostics only.
   * @param {number} action
   * @returns {string|*}
   */
  actionName: (action) => {
    if (typeof action !== 'number') {
      return action
    }
    const i = _aCodes.indexOf(action)
    return i < 0 ? `ACTION(${action})` : _aNames[i]
  },

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
