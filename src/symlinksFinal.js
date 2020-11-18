'use strict'

const fs = require('fs')
const omit = require('lodash.omit')

const { DO_NOTHING, DO_SKIP, T_DIR, T_FILE, T_SYMLINK } = require('./src/constants')
const { shadow } = require('./src/Walker')
const { createEntry } = require('./src/translateDirEntry')
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
  const { realpath, stat } = exports
  const { absPath, closure } = context

  return Promise.all(entries.map(({ action, name, type }, index) => {
    if (type !== T_SYMLINK || action >= DO_SKIP) return DO_NOTHING

    const path = absPath + name

    return stat(path)
      .then(st => {
        //  Get the actual target and replace the entry (an expensive op).
        return realpath(path).then(real => {
          if (st.isDirectory()) {
            entries[index] = createEntry(real, T_DIR, action)
          } else if (st.isFile()) {
            entries[index] = createEntry(real, T_FILE, action)
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

exports = module.exports = symlinksFinal

//  Injection points for special cases e.g. testing.
exports.realpath = fs.promises.realpath
exports.stat = fs.promises.stat
