/**
 * @module stubs/checkType
 * @version 1.0.0
 */
'use strict'
const { format } = require('util')

const errorMessages = {
  ERR_DIR_CLOSED: 'Directory handle was closed',
  ERR_INVALID_ARG_TYPE: 'The "%s" argument must be of type string or an instance of Buffer or URL',
  ERR_INVALID_CALLBACK: 'Callback must be a function'
}

const checkType = (value, expected, code, name = '') => {
  const actual = typeof value

  if (actual === expected) return
  const m = errorMessages[code]
  const e = new TypeError((name ? format(m, name) : m) + '. Received ' + actual)
  e.code = code
  throw e
}

module.exports = checkType
