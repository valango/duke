'use strict'

const { isAbsolute, sep } = require('path')

/**
 * Strips the CWD part from given `path`.
 *
 * @param {string} path  - absolute path.
 * @param {string=} rootPath - defaults to user's home directory.
 * @param {string=} prefix   - for relative path.
 * @returns {string|*}
 * @throws {Error} on ambiguous `rootPath` and `prefix` combination.
 */
const relativize = (path, rootPath = undefined, prefix = undefined) => {
  const { homeDir } = relativize
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

  const res = path.indexOf(root) === 0
    ? (pref || '') + path.substring(root.length)
    : path

  const parsed = /^(.+[^/])\/$/.exec(res)

  return parsed ? parsed[1] : res
}

relativize.homeDir = require('os').homedir() + sep

module.exports = relativize
