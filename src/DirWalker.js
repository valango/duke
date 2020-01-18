'use strict'
const ME = 'DirWalker'

const { opendirSync } = require('fs')
const { join } = require('path')
const { inspect } = require('util')
const definitions = require('./definitions')
const RuleTree = require('./RuleTree')
/* eslint-disable */
const {
        DO_ABORT, NOT_YET, DO_SKIP,
        NIL,
        T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK
      } = definitions
/* eslint-enable */

const ErrorEvent = ME + '-error'

const types = {
  isBlockDevice: T_BLOCK,
  isCharacterDevice: T_CHAR,
  isDirectory: T_DIR,
  isFIFO: T_FIFO,
  isFile: T_FILE,
  isSocket: T_SOCKET,
  isSymbolicLink: T_SYMLINK
}

const getType = (entry) => {
  for (const test of Object.keys(types)) {
    if (entry[test]()) return types[test]
  }
}

/**
 * @typedef TDirWalkerOptions {Object}
 * @member {number} [defaultAction]
 * @member {*} [rules]
 * @member {function():number} [processor] will be called on every dir-entry
 */

/**
 *  Walks a directory tree according to rules.
 */
class DirWalker extends RuleTree {
  /**
   * @param {TDirWalkerOptions=} options - can be overridden later.
   */
  constructor (options = undefined) {
    const opts = options || {}
    super(opts.rules, opts.defaultAction)
    this.failures = []
    this.directory = undefined
    //  This method can be dynamically changed.
    this.process = opts.processor ||
      ((entryContext) => this.processEntry(entryContext))
  }

  handleError_ (error, context = undefined) {
    const d = { context, instance: this }
    // this.emit(ErrorEvent, error, d)
    if (d.action !== undefined) {
      return d.action === DO_SKIP ? undefined : d.action
    }
    const comment = context &&
      (typeof context === 'string' ? context : inspect(context))
    this.registerFailure(error.message, comment)
  }

  /**
   * To be overridden in derived classes.
   * @param entryContext
   * @returns {*}
   */
  processEntry ({ action }) {
    return action
  }

  registerFailure (failure, comment = '') {
    let msg = typeof failure === 'string' ? failure : failure.message
    if (comment) msg += '\n  ' + comment
    this.failures.push(msg)
    return this
  }

  /**
   *  Process directory tree width-first starting from `rootDir`.
   *  If `rules` are defined, test these for ever directory entry
   *  and invoke `process` method.
   *
   * @param rootDir
   * @returns {DirWalker}
   */
  walk (rootDir) {
    const paths = []
    let directory
    this.failures = []
    paths.push({ parents: [NIL], depth: 0, dir: '' })

    const close = () => {
      if (!directory) return
      directory.closeSync()
      directory = undefined
    }

    while (paths.length) {
      const { parents, depth, dir } = paths.shift(), length = paths.length
      try {
        this.directory = opendirSync(join(rootDir, dir))
      } catch (error) {
        close()
        const r = this.handleError_(error)
        if (r === DO_ABORT || r === DO_SKIP) return this
      }

      //  istanbul ignore next
      if (!this.directory) {
        continue                        //  There was an error.
      }
      let entry

      while ((entry = this.directory.readSync())) {
        const name = entry.name
        const type = getType(entry)

        const action = this.test(name, parents)
        const ultimate = this.process(
          { action, depth, dir, name, rootDir, type, parents })

        if (ultimate === DO_ABORT) {
          paths.splice(length, length)
          break
        } else if (type === T_DIR && ultimate !== DO_SKIP) {
          paths.push({
            depth: depth + 1,
            dir: join(dir, name),
            parents: this.rules && this.rules.lastMatches
          })
        }
      }
      close()
    }
    return this
  }
}

Object.assign(DirWalker, { ErrorEvent, RuleTree, ...definitions })
module.exports = DirWalker
