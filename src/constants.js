'use strict'
/** @namespace constants */

//  ========   Action codes.  =======
//  Application-specific action codes must have values between NO_NOTHING and DO_SKIP!
//  The code values here are compromise between human readability and enough space.

/** The current walk will be pushed to queue for the next attempt.
 * DO NOT use in rules!
 * @const {number} */
const DO_RETRY = -111111

/** No effect - wak continues normally.
 * DO NOT use in rules!
 * @const {number} */
const DO_NOTHING = 0

/** Ignored by Walker, but may have special meaning for application code.
 * @const {number} */
const DO_CHECK = 100000

/** Ignore the current directory entry.
 * @const {number} */
const DO_SKIP = 100001

/** Exit the current directory ignoring its contents and descendants.
 * @const {number} */
const DO_ABORT = 100002

/** The `halt` method will be called terminating all walks of this Walker instance.
 * @const {number} */
const DO_HALT = 100003

//  ========   Directory entry type codes.  =======
/** @const {TEntryType} */
const T_FILE = 1
/** @const {TEntryType} */
const T_DIR = 2
/** @const {TEntryType} */
const T_SYMLINK = 3
/** @const {TEntryType} */
const T_BLOCK = 4
/** @const {TEntryType} */
const T_CHAR = 5
/** @const {TEntryType} */
const T_SOCKET = 6
/** @const {TEntryType} */
const T_FIFO = 7
/**
 * One-character entry type codes for rule definitions.
 * @type {string}
 */
const S_TYPES = ' fdlBCSF'

/* eslint 'object-property-newline': 0 */
module.exports = {
  DO_ABORT, DO_CHECK, DO_HALT, DO_NOTHING, DO_RETRY, DO_SKIP,
  S_TYPES,
  T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK
}
