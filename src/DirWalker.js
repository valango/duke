'use strict'

const defaults = require('lodash.defaults')
const { opendirSync } = require('fs')
const { join } = require('path')
const Sincere = require('sincere')
const definitions = require('./definitions')

/* eslint-disable */
const {
        DO_ABORT, DO_SKIP, DO_TERMINATE,
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
 *  Walks a directory tree according to rules.
 */
class DirWalker extends Sincere {
  constructor (options) {
    super()
    /**
     * Diagnostic messages.
     * @type {Array<string>}
     */
    this.failures = []
    /**
     * Options to be applied to walk() by default.
     * @type {Object}
     */
    this.options = options
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

  safely_ (opts, func, args) {
    let r

    try {
      delete opts.error
      r = func.call(this, args)
    } catch (error) {
      opts.error = error
      if (opts.onError) r = opts.onError.call(this, error, args)
      if (r === undefined) {
        if (error.code === 'ENOTDIR') {
          r = DO_SKIP
        } else if (error.code !== 'EPERM') r = DO_ABORT
      }
      if (r !== DO_SKIP) this.registerFailure(error)
    }
    if (r === DO_TERMINATE) {
      this.terminate = true
    }
    return r
  }

  /**
   *  Process directory tree width-first starting from `root`
   *  and invoke appropriate on... method.
   *
   * @param {string} root
   * @param {Object<{?onBegin, ?onEnd, ?onEntry, ?onError}>} options
   * @returns {DirWalker}
   */
  walk (root, options = undefined) {
    const opts = defaults({}, options, this.options)
    const onBegin = opts.onBegin || noop
    const onEnd = opts.onEnd || noop
    const onEntry = opts.onEntry || noop
    const paths = []
    let action, directory, entry

    paths.push({ locals: opts.locals || {}, depth: 0, dir: '' })

    while (paths.length && !this.terminate) {
      const { depth, dir, locals } = paths.shift()
      const absDir = join(root, dir), length = paths.length

      action = this.safely_(opts, onBegin, { absDir, depth, dir, locals, root })
      if (action === DO_ABORT) return this
      if (action === DO_SKIP) continue

      directory = this.safely_(opts, opendirSync, join(root, dir))

      if (opts.error) {
        if (directory === DO_ABORT) return this
        continue
      }

      while ((entry = directory.readSync())) {
        const name = entry.name, type = getType(entry)

        action = this.safely_(opts, onEntry,
          { absDir, depth, dir, locals, name, root, type })

        if (action === DO_ABORT) {
          paths.splice(length, length)
          break
        } else if (type === T_DIR && action !== DO_SKIP) {
          if (opts.error) break
          paths.push({
            depth: depth + 1,
            dir: join(dir, name),
            locals: typeof action === 'object' ? action : {}
          })
        }
      }
      directory.closeSync()

      action = this.safely_(opts, onEnd, { absDir, depth, dir, locals, root })

      if (action === DO_ABORT || (opts.error && action !== DO_SKIP)) {
        return this
      }
    }
    return this
  }
}

module.exports = DirWalker
