'use strict'

/**
 * Strip the CWD part from give `path`.
 *
 * @param {string} path      - assumed to be absolute path.
 * @param {string=} prefix   - usually './'
 * @param {string=} givenCwd - override process.cwd()
 * @returns {string|*}
 */
module.exports = (path, prefix = '', givenCwd = undefined) => {
  const cwd = givenCwd || process.cwd()

  if (path.indexOf(cwd) !== 0) return path
  return prefix + path.substring(cwd.length + 1)
}
