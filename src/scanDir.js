/**
 * @module src/scanDir
 * Open directory, call onDir and onEntry probes.
 */
'use strict'
const fs = require('fs')
const { DO_ABORT, DO_NOTHING, DO_SKIP, DO_TERMINATE } = require('./constants')
const translateDirEntry = require('./translateDirEntry')

const opendir = fs.promises.opendir

module.exports = () => {
  //  Todo: instead of setting local error trap, just modify context.locus.
  //  execute( fn, args, context, [locus])
  return async function (context, { onDir, onEntry }) {
    let arg, result = this.async_(opendir, context, context.absPath)

    if (result && typeof result === 'object' && !(result instanceof Error)) {
      const dir = result, entries = []

      result = this.exec_(onDir, context, context)
      for await (arg of dir) {
        arg = translateDirEntry(arg)
        result = this.exec_(onEntry, context, context, arg)
        if (!(result < DO_ABORT)) break
        if (result < DO_SKIP) entries.push(arg)
      }
      if (result < DO_ABORT) {
        result = { context, entries }
      }
      try {
        await dir.close()
      } catch (error) {
        if (error.code !== 'ERR_DIR_CLOSED') {
          result = error
        }
      }
    }

    return result
  }
}
