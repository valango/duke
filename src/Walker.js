'use strict'

const defaults = require('lodash.defaults')
const { opendirSync } = require('fs')
const { join } = require('path')
const { format } = require('util')
const Sincere = require('sincere')
const definitions = require('./definitions')

/* eslint-disable */
const {
        CONTINUE, DISCLAIM, DO_ABORT, DO_SKIP, DO_TERMINATE,
        T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK,
        actionName
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
 *  Walks a directory tree according to rules.
 */
class Walker extends Sincere {
  constructor (options, data) {
    super()
    /**
     * Shared (not copied) data space - may be used by derived classes.
     * @type {*|Object}
     */
    this.data = data || {}
    /**
     * Diagnostic messages.
     * @type {Array<string>}
     */
    this.failures = []
    /**
     * Options to be applied to walk() by default.
     * @type {Object}
     */
    this.options = defaults({}, options)
    /**
     * When true, walking will terminate immediately.
     * @type {boolean}
     */
    this.terminate = false
    /**
     * Descriptors of recognized filesystem subtrees.
     * @type {Array<{absDir, ...}>}
     */
    this.trees = []
  }

  /**
   * Check if the current directory should be recognized as special.
   *
   * @param {Object} context
   * @returns {*}
   */
  detect (context) {
    const inserted = this.options.detect
    return inserted && inserted.call(this, context)
  }

  /**
   * Get descriptor for the current directory if it was recognized.
   * @param {string} dir
   * @returns {{absDir, '...'}|undefined}
   */
  getCurrent (dir) {
    this.trees.find((p) => p.absDir === dir)
  }

  /**
   * Find tree above the current directory.
   * @param {string} dir
   * @returns {{absDir, '...'}|undefined}
   */
  getMaster (dir) {
    return this.trees.find(
      (p) => dir.indexOf(p.absDir) === 0 && dir !== p.absDir)
  }

  onBegin (ctx) {
    if (this.options.onEntry) return this.options.onEntry.call(this, ctx)
    const { absDir, locals } = ctx

    //  Check if already done - may happen when multi-threading.
    if (this.getCurrent(absDir)) return DO_SKIP

    if ((locals.master = this.getMaster(absDir))) {
      locals.current = locals.master
      if (!this.options.nested) {
        return this.talk('  DIR', ctx.absDir, ctx.dir)
      }
    }

    const res = this.detect(ctx)

    if (!locals.rules) {
      locals.rules = this.options.defaultRules
      locals.ancestors = undefined
    }
    return res
  }

  onEnd (ctx) {
    if (this.options.onEntry) return this.options.onEntry.call(this, ctx)
    const { locals } = ctx

    if (locals.current) {
      if (!locals.master) {
        this.trees.push(locals.current)
      }
      if (this.getCurrent(ctx.absDir)) this.talk('END', ctx.dir)
    }
    return locals.current
  }

  onEntry (ctx) {
    if (this.options.onEntry) return this.options.onEntry.call(this, ctx)

    const { locals, name, type } = ctx
    let action = DISCLAIM, ancestors

    if (locals.rules) {
      [action, ancestors] = locals.rules.test(name, locals.ancestors)
    }
    switch (action) {
      case CONTINUE:
      case DISCLAIM:
        //  Forward our rule parsing context to subdirectory.
        if (type === T_DIR) {
          return { ancestors, rules: locals.rules }
        }
        break
      case DO_ABORT:
        this.talk('  DO_ABORT', ctx.dir)
        break
      case DO_SKIP:
        break
      default:
        if (type === T_DIR) {
          this.talk('default', actionName(action), name)
        }
    }
    return action
  }

  onError (error, args) {
    if (this.options.onError) {
      return this.options.onEntry.call(this, error, args)
    }
  }

  /**
   * Accumulate all kind of stuff into `failures` array to be enjoyed
   * when the walk is over.
   *
   * @param {*} failure - presumably error instance or string.
   * @param {string=} comment - if present, will be added with newline.
   * @returns {Walker}
   */
  registerFailure (failure, comment = '') {
    let msg = failure.stack || failure.message || failure + ''

    if (comment) msg += '\n  ' + comment
    this.failures.push(msg)
    return this
  }

  //  Execute a function or handler, catching possible errors.
  //  Do default error handling.
  safely_ (opts, func, args) {
    let r

    try {
      delete opts.error
      r = func.call(this, args)
    } catch (error) {
      opts.error = error
      if (opts.onError) r = opts.onError.call(this, error, args)
      if (r === undefined) {
        if (error.code === 'ENOENT') {
          this.registerFailure(error.message)
          r = DO_SKIP
        } else if (error.code === 'EPERM') {
          this.registerFailure(error.message)
        } else {
          this.registerFailure(error, format('arguments: %O', args))
          r = DO_TERMINATE
        }
      } else if (r !== DO_SKIP) this.registerFailure(error)
    }
    if (r === DO_TERMINATE) {
      this.terminate = true
    }
    return r
  }

  talk (...args) {
    if (this.options.talk) this.options.talk.apply(this, args)
  }

  /**
   *  Process directory tree width-first starting from `root`
   *  and invoke appropriate on... method.
   *
   * @param {string} root
   * @param {Object<{?locals}>} options
   * @returns {Walker}
   */
  walk (root, options = undefined) {
    const opts = defaults({}, options, this.options)
    const paths = []
    let action, directory, entry

    paths.push({ locals: opts.locals || {}, depth: 0, dir: '' })

    while (paths.length && !this.terminate) {
      const { depth, dir, locals } = paths.shift()
      const absDir = join(root, dir), length = paths.length

      directory = this.safely_(opts, opendirSync, join(root, dir))

      if (opts.error) {
        if (directory === DO_ABORT) return this
        continue
      }

      action = this.safely_(opts, this.onBegin,
        { absDir, depth, dir, locals, root })
      if (action === DO_ABORT) {
        directory.closeSync()
        return this
      }
      if (action === DO_SKIP) {
        directory.closeSync()
        continue
      }

      while ((entry = directory.readSync())) {
        const name = entry.name, type = getType(entry)

        action = this.safely_(opts, this.onEntry,
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

      action = this.safely_(opts, this.onEnd,
        { absDir, depth, dir, locals, root })

      if (action === DO_ABORT || (opts.error && action !== DO_SKIP)) {
        return this
      }
    }
    return this
  }
}

module.exports = Walker
