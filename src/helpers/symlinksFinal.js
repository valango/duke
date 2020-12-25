'use strict'

//  Support for an easy fs mock - for testing, you know.
let realpath, stat

const mockFs = fs => {
  realpath = fs.promises.realpath
  stat = fs.promises.stat
}

mockFs(require('fs'))

const omit = require('lodash.omit')

const { DO_NOTHING, DO_SKIP, T_DIR, T_FILE, T_SYMLINK } = require('../constants')
const { shadow } = require('../Walker')
const { createDirEntry } = require('../util/dirEntry')
const { isNaN } = Number

/**
 * Part of onFinal handler for de-referencing symbolic links.
 * @param {Array} entries
 * @param {TWalkContext} context
 * @returns {Promise}
 * @example
 * // Using it in `onFinal` handler.
 * oFinal (entries, context) {
 *   return this._useSymLinks
 *     ? symlinksFinal.call(this, entries, context) : Promise.resolve(0)
 * }
 */
function symlinksFinal (entries, context) {
  const { ownPath, closure } = context

  return Promise.all(entries.map(({ action, name, type }, index) => {
    if (type !== T_SYMLINK || action >= DO_SKIP) return DO_NOTHING

    const path = ownPath + name

    return stat(path)
      .then(st => {
        //  Get the actual target and replace the entry (an expensive op).
        return realpath(path).then(real => {
          if (st.isDirectory()) {
            entries[index] = createDirEntry(real, T_DIR, action)
          } else if (st.isFile()) {
            entries[index] = createDirEntry(real, T_FILE, action)
          }
          return 0  //  The return value is ignored.
        })
      })
      .catch(error => {
        if (this.halted || !error.code) throw error
        if (error.code === 'ENOENT') {
          error.message = `WALKER: broken symlink '${path}'`
        }
        (error.context = omit(context, shadow)).locus = 'onFinal'
        return this.failures.push(error)
      })
      .finally(() => {
        //  Check if a Terminal Condition is set by some other walk.
        if (isNaN(closure.threadCount) || this.halted) {
          throw new Error('symlinksFinal')   //  Yes - kill the promise in progress.
        }
        return 0
      })
  }))
    .catch(error => {
      if (error.message !== 'symlinksFinal') throw error
    })
    .then(() => DO_NOTHING)
}

symlinksFinal.mockFs = mockFs

module.exports = symlinksFinal
