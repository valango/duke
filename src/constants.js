'use strict'

/** @namespace constants */
const constants = {
  /** Action code: the current item might have a special meaning for application.
   * @const {number} */
  DO_CHECK: 10000,
  /** Action code: skip this directory entry.
   * @const {number} */
  DO_SKIP: 10001,
  /** Action code: discard all in the current directory.
   * @const {number} */
  DO_ABORT: 10002,
  /** Action code: discard all in the current directory; terminate all walking.
   * @const {number} */
  DO_HALT: 10003,
  /** Action code, reserved for internal use: do not use this in rule definition!
   * @const {number} */
  DO_NOTHING: 0,
  /** Action code, reserved for internal use: do not use this in rule definition!
   * @const {number} */
  DO_RETRY: -10003,

  /** @const {TEntryType} */
  T_BLOCK: 'B',
  /** @const {TEntryType} */
  T_CHAR: 'C',
  /**
   * Directory type flag - the only one with special meaning for Ruler.
   * @const {TEntryType}
   * @default
   */
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
