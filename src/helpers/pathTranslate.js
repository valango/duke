'use strict'

const { join, resolve, sep } = require('path')
const { homedir } = require('os')

/**
 * Translate a (possibly) POSIX path to native OS format; replace leading '~' w homedir.
 *
 * @param {string} givenPath
 * @param {boolean} [absolute] - require the result to be separator-terminated absolute path.
 * @returns {string}
 */
const pathTranslate = (givenPath, absolute = false) => {
  let path = givenPath

  //  Translate from Posix, if necessary.
  if (sep !== '/') {
    path = path.split('/').join(sep)
  }
  //  Translate user homedir, if present.
  if (path.indexOf('~' + sep) === 0) {
    path = join(homedir(), path.substring(1))
  }
  if (absolute) {
    path = join(resolve(path), sep)
  }
  return path
}

module.exports = pathTranslate
