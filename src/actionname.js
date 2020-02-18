'use strict'

const { format } = require('util')

const { DO_SKIP, DO_ABORT, DO_TERMINATE } = require('./constants')

const _aCodes = [0, DO_SKIP, DO_ABORT, DO_TERMINATE]
const _aNames = [0, 'DO_SKIP', 'DO_ABORT', 'DO_TERMINATE']

/**
 * Translate action code to human-readable string. For diagnostics only.
 * @param {number} action
 * @param {string=} frmt
 * @returns {string|*}
 */
const actionName = (action, frmt = undefined) => {
  if (action && typeof action === 'object' && action.action !== undefined) {
    return actionName(action.action, '{ action: %s }')
  }
  if (typeof action !== 'number') {
    return format(frmt || '%O', action)
  }
  let a = action, s = ''
  if (a < 0) (a = -a) && (s = '-')
  const i = _aCodes.indexOf(a)
  const v = i && (s + (i < 0 ? `ACTION(${action})` : _aNames[i]))
  return frmt ? format(frmt, v) : v
}

module.exports = actionName
