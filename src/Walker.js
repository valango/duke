'use strict'

const defaults = require('lodash.defaults')
const { opendirSync } = require('fs')
const { join, resolve } = require('path')
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

const TICK = 200
let _nextTick = 0

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
    this.tick = options.tick || (() => undefined)
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

  //  `undefined`: error was not handled.
  //  `Error`    : treat this value as unrecoverable error.
  //  otherwise  : assume that error was handled
  onError (error, args, expected) {
    let res

    if (this.options.onError) {
      res = this.options.onEntry.call(this, error, args)
    }
    if (res !== undefined) return res
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
  //
  safely_ (closure, func, args, expected = []) {
    let r

    try {
      delete closure.error
      r = func.call(this, args)
    } catch (error) {
      if ((r = this.onError(error, args, expected)) === undefined) {
        if (expected.indexOf(error.code) >= 0) {
          this.registerFailure(error.message)
          return DO_SKIP
        }
        r = error
      }
      if (r instanceof Error) {
        (closure.error = r).arguments = args
        r = DO_TERMINATE
      }
      _nextTick = 0
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
   *  Process directory tree asynchronously width-first starting from `root`
   *  and invoke appropriate on... method.
   *
   * @param {string} root
   * @param {Object<{?locals}>} options
   * @returns {Promise}
   */
  walk (root, options = undefined) {
    return new Promise((resolve, reject) => {
      const res = this.walk_(root, options)

      res.error ? reject(res.error) : resolve(res)
    })
  }

  /**
   *  Synchronous version of walk() method.
   *
   * @param {string} root
   * @param {Object<{?locals}>} options
   * @returns {Object}
   * @throws {Error}
   */
  walkSync (root, options = undefined) {
    const res = this.walk_(root, options)

    if (res.error) throw res.error
    return res
  }

  walk_ (rootPath, options = undefined) {
    const closure = defaults({}, options, this.options)
    const paths = [], root = resolve(rootPath)
    let action, directory, entry, t

    closure.root = root
    paths.push({ locals: closure.locals || {}, depth: 0, dir: '' })

    while (paths.length && !this.terminate) {
      const { depth, dir, locals } = paths.shift()
      const absDir = join(root, dir), length = paths.length

      directory = this.safely_(closure, opendirSync, join(root, dir),
        ['ENOENT', 'ENOTDIR', 'EPERM'])

      if (typeof directory !== 'object') {
        continue
      }

      action = this.safely_(closure, this.onBegin,
        { absDir, depth, dir, locals, root })

      if (!(action <= DO_TERMINATE && action >= DO_SKIP)) {
        if ((t = Date.now()) > _nextTick) {
          _nextTick = Infinity
          _nextTick = t + TICK
          this.tick()
        }

        while ((entry = directory.readSync())) {
          const name = entry.name, type = getType(entry)

          action = this.safely_(closure, this.onEntry,
            { absDir, depth, dir, locals, name, root, type })

          if (action === DO_ABORT || action === DO_TERMINATE) {
            paths.splice(length, length)
            break
          } else if (type === T_DIR && action !== DO_SKIP) {
            paths.push({
              depth: depth + 1,
              dir: join(dir, name),
              locals: typeof action === 'object' ? action : {}
            })
          }
        }       //  end while (entry...)
      }       //  end if (action...)
      directory.closeSync()

      action = this.safely_(closure, this.onEnd,
        { absDir, action, depth, dir, locals, root })

      if (action === DO_ABORT) {
        break
      }
    }       //  end while (paths...)
    return closure
  }
}

module.exports = Walker
