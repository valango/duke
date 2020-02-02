'use strict'

const { format } = require('util')

const { CONTINUE, DISCLAIM, DO_SKIP, DO_ABORT, DO_TERMINATE } =
        require('./definitions')

const _aCodes = [CONTINUE, DISCLAIM, DO_SKIP, DO_ABORT, DO_TERMINATE]
const _aNames = [
  'CONTINUE', 'DISCLAIM', 'DO_SKIP', 'DO_ABORT', 'DO_TERMINATE'
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
  const i = _aCodes.indexOf(action)
  const v = i < 0 ? `ACTION(${action})` : _aNames[i]
  return f ? format(f, v) : v
}
