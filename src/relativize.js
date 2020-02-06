'use strict'

const { isAbsolute, sep } = require('path')
const homeDir = require('os').homedir() + sep

/**
 * Strip the CWD part from give `path`.
 *
 * @param {string} path  - absolute path.
 * @param {string=} rootPath - defaults to user's home directory.
 * @param {string=} prefix   - for relative path.
 * @returns {string|*}
 * @throws {Error} on ambiguous `rootPath` and `prefix` combination.
 */
module.exports = (path, rootPath = undefined, prefix = undefined) => {
  let pref = prefix, root = rootPath

  if (!root) {
    root = homeDir
  } else if (!isAbsolute(root)) {
    if (pref !== undefined) throw Error('relativize() arguments conflict')
    pref = root
    root = homeDir
  }

  if (root[root.length - 1] !== sep) root += sep

  if (pref && pref[pref.length - 1] !== sep) pref += sep

  return path.indexOf(root) === 0
    ? (pref || '') + path.substring(root.length)
    : path
}
