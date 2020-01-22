'use strict'

const { opendirSync } = require('fs')
const { join } = require('path')
const Sincere = require('sincere')
const definitions = require('./definitions')

/* eslint-disable */
const {
        DO_ABORT, DO_SKIP, TERMINATE,
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

const abort = () => DO_ABORT
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
  constructor () {
    super()
    /**
     * Diagnostic messages.
     * @type {*[]}
     */
    this.failures = []
    /**
     * When true, walking will terminate immediately.
     * @type {boolean}
     */
    this.terminate = false
  }

  registerFailure (failure, comment = '') {
    let msg = typeof failure === 'string' ? failure : failure.message
    // console.log('REG', msg)
    if (comment) msg += '\n  ' + comment
    this.failures.push(msg)
    // console.log(this.sincereMessage('registerFailure', [this.failures.length]))
    return this
  }

  /**
   *  Process directory tree width-first starting from `root`.
   *  If `rules` are defined, test these for ever directory entry
   *  and invoke appropriate method.
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
    const onError = opts.onError
    const paths = []
    let absDir, action, directory, entry, trapped

    paths.push({ locals: opts.locals || {}, depth: 0, dir: '' })

    const safely = (func, args) => {
      let r
      try {
        trapped = undefined
        r = func.call(this, args)
      } catch (error) {
        trapped = error
        if (onError) r = onError.call(this, error, args)
        if (r === undefined) {
          if (error.code === 'ENOTDIR') {
            r = DO_SKIP
          } else if (error.code !== 'EPERM') r = DO_ABORT
        }
        if (r !== DO_SKIP) this.registerFailure(error)
      }
      if (r === TERMINATE) {
        this.terminate = true
      }
      return r
    }

    while (paths.length && !this.terminate) {
      const { depth, dir, locals } = paths.shift(), length = paths.length

      absDir = join(root, dir)

      if (absDir === '/Users/villema/settings170429.jar') {
        absDir = join(root, dir)
      }
      action = safely(onBegin, { absDir, depth, dir, locals, root })
      if (action === DO_ABORT) return this
      if (action === DO_SKIP) continue

      directory = safely(opendirSync, join(root, dir))

      if (trapped) {
        if (directory === DO_ABORT) return this
        continue
      }

      while ((entry = directory.readSync())) {
        const name = entry.name
        const type = getType(entry)

        action = safely(onEntry,
          { absDir, depth, dir, locals, name, root, type })

        if (action === DO_ABORT) {
          paths.splice(length, length)
          break
        } else if (type === T_DIR && action !== DO_SKIP) {
          if (trapped) break
          paths.push({
            depth: depth + 1,
            dir: join(dir, name),
            locals: typeof action === 'object' ? action : {}
          })
        }
      }
      directory.closeSync()

      if ((action = safely(onEnd, { absDir, depth, dir, locals, root })) ===
        DO_ABORT || (trapped && action !== DO_SKIP)) {
        return this
      }
    }
    return this
  }
}

module.exports = DirWalker
