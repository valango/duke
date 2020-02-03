'use strict'

const { format } = require('util')

const { CONTINUE, DO_SKIP, DO_ABORT, DO_TERMINATE } =
        require('./definitions')

const _aCodes = [CONTINUE, DO_SKIP, DO_ABORT, DO_TERMINATE]
const _aNames = [
  'CONTINUE', 'DO_SKIP', 'DO_ABORT', 'DO_TERMINATE'
]

/**
 * Translate action code to human-readable string. For diagnostics only.
 * @param {number} action
 * @returns {string|*}
 */
exports = module.exports = (action, f = undefined) => {
  if (action && typeof action === 'object' && action.action !== undefined) {
    return exports(action.action, '{ action: %s }')
  }
  if (typeof action !== 'number') {
    return format(f || '%O', action)
  }
  let a = action, s = ''
  if (a < 0) (a = -a) && (s = '-')
  const i = _aCodes.indexOf(a)
  const v = s + (i < 0 ? `ACTION(${action})` : _aNames[i])
  return f ? format(f, v) : v
}
