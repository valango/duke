'use strict'

const { homedir } = require('os')

/**
 * Translate a (possibly) POSIX path to native OS format; replace leading '~' w homedir.
 *
 * @param {string} givenPath
 * @param {boolean} [absolute] - require the result to be separator-terminated absolute path.
 * @returns {string}
 */
const pathTranslate = (givenPath, absolute = false) => {
  const { core } = exports, { join, sep } = core
  let path = givenPath || '.'

  //  Translate from Posix, if necessary.
  if (sep !== '/') {
    path = path.split('/').join(sep)
  }
  //  Translate user homedir, if present.
  if (path.indexOf('~' + sep) === 0 || path === '~') {
    path = join(homedir(), path.substring(1))
  }
  if (absolute) {
    path = join(core.resolve(path), sep)
  }
  return path
}

exports = module.exports = pathTranslate

//  For testing
exports.core = require('path')
