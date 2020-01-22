'use strict'

const { opendirSync } = require('fs')
const { join } = require('path')
const Sincere = require('sincere')
const definitions = require('./definitions')

/* eslint-disable */
const {
        BEGIN_DIR, END_DIR, DO_ABORT, DO_SKIP,
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

const noop = () => undefined

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
class DirWalker extends Sincere {
  /**
   * @param {TDirWalkerOptions=} options - can be overridden later.
   */
  constructor (options = undefined) {
    const opts = options || {}
    super()
    // super(opts.rules, opts.defaultAction)
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
   * @param {Object=} options
   * @returns {DirWalker}
   */
  walk (root, options = undefined) {
    const opts = options || {}
    const onBegin = opts.onBegin || noop
    const onEnd = opts.onEnd || noop
    const onEntry = opts.onEntry || noop
    const onError = opts.onError || noop
    const paths = []
    let absDir, action, directory, entry
    this.failures = []
    paths.push({ locals: opts.locals || {}, depth: 0, dir: '' })

    while (paths.length) {
      const { depth, dir, locals } = paths.shift(), length = paths.length

      ;(absDir = join(root, dir)) && (action = BEGIN_DIR)

      action = onBegin.call(this, { absDir, action, depth, dir, locals, root })
      if (action === DO_ABORT) return this
      if (action === DO_SKIP) continue

      try {
        directory = opendirSync(join(root, dir))
      } catch (error) {
        //  To retry, the handler must just path.unshift() and return falsy.
        const r = onError.call(this,
          { absDir, depth, dir, error, locals, root })
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

        action = onEntry.call(this,
          { absDir, depth, dir, locals, name, root, type })

        if (action === DO_ABORT) {
          paths.splice(length, length)
          break
        } else if (type === T_DIR && action !== DO_SKIP) {
          paths.push({
            depth: depth + 1,
            dir: join(dir, name),
            locals
          })
        }
      }
      directory.closeSync()
      directory = undefined
      action = END_DIR

      if (onEnd.call(this, { absDir, action, depth, dir, locals, root }
      ) === DO_ABORT) {
        return this
      }
    }
    return this
  }
}

module.exports = DirWalker
