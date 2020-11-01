/**
 * @module src/scanDir
 * Open directory, call onDir and onEntry probes.
 */
'use strict'
const fs = require('fs')
const { DO_ABORT, DO_SKIP, DO_TERMINATE } = require('./constants')
const translateDirEntry = require('./translateDirEntry')

const opendir = fs.promises.opendir

module.exports = () => {
  const scanDir_ = async function (context, { onDir, onEntry }, fail_) {
    const entries = []
    let arg, dir, locus = 'opendir', result

    // opendir('context.absPath', (e, v) => {
    //  return e
    // })
    try {
      arg = context.rootPath + context.dirPath
      dir = await opendir(arg)
      locus = 'onDir'
      this.visited.set(context.absPath, onDir.call(this, context))

      locus = 'onEntry'
      for await (arg of dir) {
        arg = translateDirEntry(arg)
        result = onEntry.call(this, context, arg)
        if (result >= DO_ABORT) break
        if (result < DO_SKIP) entries.push(arg)
      }
      result = { action: result, context, entries }
    } catch (error) {
      context.locus = locus
      result = this.onError_(error, context, [arg], result)
      if (result instanceof Error) return fail_(result)
    }
    try {
      await dir.close()   //  Probably already closed, if not aborted.
    } catch (error) {
      // if (error.code !== 'ERR_DIR_CLOSED') return fail_(error)
      context.locus = 'closedir'
      result = this.onError_(error, context, [], result)
      if (result instanceof Error) return fail_(result)
    }
    if (result.action >= DO_TERMINATE && this.terminate === undefined) {
      this.terminate = context
    }
    return result
  }

  return scanDir_
}
