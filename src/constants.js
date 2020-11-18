'use strict'
/** @namespace constants */

//  ========   Action codes.  =======
//  Application-specific action codes must have values between NO_NOTHING and DO_SKIP!
//  The code values here are compromise between human readability and enough space.

/** The current walk will be pushed to queue for the next attempt.
 * DO NOT use in rules!
 * @const {number} */
const DO_RETRY = -10003

/** No effect - wak continues normally.
 * DO NOT use in rules!
 * @const {number} */
const DO_NOTHING = 0

/** Ignored by Walker, but may have special meaning for application code.
 * @const {number} */
const DO_CHECK = 10000

/** Ignore the current directory entry.
 * @const {number} */
const DO_SKIP = 10001

/** Exit the current directory ignoring its contents and descendants.
 * @const {number} */
const DO_ABORT = 10002

/** The `halt` method will be called terminating all walks of this Walker instance.
 * @const {number} */
const DO_HALT = 10003

//  ========   Directory entry type codes.  =======
/** @const {TEntryType} */
const T_BLOCK = 'B'
/** @const {TEntryType} */
const T_CHAR = 'C'
/** @const {TEntryType} */
const T_DIR = 'd'
/** @const {TEntryType} */
const T_FIFO = 'F'
/** @const {TEntryType} */
const T_FILE = 'f'
/** @const {TEntryType} */
const T_SOCKET = 'S'
/** @const {TEntryType} */
const T_SYMLINK = 'l'

/**
 * TEntryType labels for indication.
 * @type {Object<string, string>}
 */
const LABELS = Object.freeze({
  [T_DIR]: 'directory',
  [T_FILE]: 'file',
  [T_SYMLINK]: 'symlink',
  [T_BLOCK]: 'block-device',
  [T_CHAR]: 'char-device',
  [T_FIFO]: 'fifo',
  [T_SOCKET]: 'socket'
})

/* eslint 'object-property-newline': 0 */
module.exports = {
  DO_ABORT, DO_CHECK, DO_HALT, DO_NOTHING, DO_RETRY, DO_SKIP,
  LABELS,
  T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK
}
