'use strict'

/**
 * @typedef {string} TEntryType
 * Value of directory entry `type` property.
 */

/** @namespace constants */
const constants = {
  /** Action code: skip this directory entry.
   * @const {number} */
  DO_SKIP: Number.MAX_SAFE_INTEGER - 2,
  /** Action code: Discard all in current directory.
   * @const {number} */
  DO_ABORT: Number.MAX_SAFE_INTEGER - 1,
  /** Action code: Discard all in current directory; terminate all walking.
   * @const {number} */
  DO_TERMINATE: Number.MAX_SAFE_INTEGER,

  /** @const {TEntryType} */
  T_ANY: '',
  /** @const {TEntryType} */
  T_BLOCK: 'B',
  /** @const {TEntryType} */
  T_CHAR: 'C',
  /** @const {TEntryType} */
  T_DIR: 'd',
  /** @const {TEntryType} */
  T_FIFO: 'F',
  /** @const {TEntryType} */
  T_FILE: 'f',
  /** @const {TEntryType} */
  T_SOCKET: 'S',
  /** @const {TEntryType} */
  T_SYMLINK: 'l'
}

module.exports = constants
