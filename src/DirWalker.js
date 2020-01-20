'use strict'

const { opendirSync } = require('fs')
const { join } = require('path')
const definitions = require('./definitions')
const loadJSON = require('./load-json')
const RuleTree = require('./RuleTree')
/* eslint-disable */
const {
        BEGIN_DIR, END_DIR, DO_ABORT, DO_SKIP,
        NIL,
        T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK
      } = definitions
/* eslint-enable */

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
    //  This method can be dynamically changed.
    this.process = opts.processor ||
      ((entryContext) => this.processEntry(entryContext))
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
   *  Process directory tree width-first starting from `root`.
   *  If `rules` are defined, test these for ever directory entry
   *  and invoke `process` method.
   *
   * @param {string} root
   * @param {Object} options
   * @returns {DirWalker}
   */
  walk (root, options = undefined) {
    const opts = options || {}
    const process = opts.process || this.process
    const onError = opts.onError || (() => 0)
    const locals = {}, paths = []
    let absDir, action, directory, entry
    this.failures = []
    paths.push({ parents: [NIL], depth: 0, dir: '' })

    while (paths.length) {
      const { parents, depth, dir } = paths.shift(), length = paths.length

      absDir = join(root, dir)
      //  Todo: here we can set parents or even the tree!
      action = process.call(this,
        { absDir, action: BEGIN_DIR, depth, dir, locals, paths, parents, root })
      if (action === DO_ABORT) return this
      if (action === DO_SKIP) continue

      try {
        directory = opendirSync(join(root, dir))
      } catch (error) {
        //  To retry, the handler must just path.unshift() and return falsy.
        const r = onError.call(this,
          { absDir, depth, dir, error, locals, root, paths })
        if (r === DO_SKIP) continue
        if (error) this.registerFailure(error)
        if (r === DO_ABORT) return this
      }
      if (!directory) {
        continue                        //  Failed to open directory.
      }

      while ((entry = directory.readSync())) {
        const name = entry.name
        const type = getType(entry)

        const action = this.test(name, parents)
        const ultimate = process.call(this,
          { absDir, action, depth, dir, locals, name, parents, paths, root, type })

        if (ultimate === DO_ABORT) {
          paths.splice(length, length)
          break
        } else if (type === T_DIR && ultimate !== DO_SKIP) {
          paths.push({
            depth: depth + 1,
            dir: join(dir, name),
            parents: this.lastMatches
          })
        }
      }
      directory.closeSync()
      directory = undefined

      if (process.call(this,
        { absDir, action: END_DIR, depth, dir, locals, paths, root }) === DO_ABORT) {
        return this
      }
    }
    return this
  }
}

Object.assign(DirWalker, { loadJSON, RuleTree, ...definitions })
module.exports = DirWalker
