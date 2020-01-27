'use strict'

const WO = 'Walker option '
const WARNING = WO + "'defaultRules' is deprecated - use 'ruler' instead."

const defaults = require('lodash.defaults')
const { opendirSync } = require('fs')
const { join, resolve } = require('path')
const Sincere = require('sincere')
const definitions = require('./definitions')
const Ruler = require('./Ruler')

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
  /**
   * @param {Object<{tick,interval}>} options may also contain on...() plugins.
   * @param {*=} sharedData - may be used by derived classes.
   */
  constructor (options, sharedData = undefined) {
    let o = defaults(undefined, options)
    super()
    /**
     * Shared (not copied) data space - may be used by derived classes.
     * @type {*|Object}
     */
    this.data = sharedData || {}
    /**
     * Default Ruler instance.
     * @type {*|Ruler}
     */
    this.defaultRuler = o.defaultRuler
    /**
     * Ruler to be used until detecting something special.
     * @type {Ruler}
     */
    this.failures = []
    /**
     * Minimum interval between this.tick() calls.
     * @type {number}
     */
    this.interval = o.interval || 200
    this.nextTick = 0
    /**
     * Options to be applied to walk() by default.
     * @type {Object}
     */
    this.options = o
    /**
     * When true, walking will terminate immediately.
     * @type {boolean}
     */
    this.terminate = false
    /**
     * Function to be called every `this.interval` while walking.
     * @type {function()}
     */
    this.tick = this.options.tick || (() => undefined)
    /**
     * Descriptors of recognized filesystem subtrees.
     * @type {Array<{absDir}>}
     */
    this.trees = []

    //  istanbul ignore next
    if (o.defaultRules) {
      this.assert(!this.defaultRuler, 'constructor',
        "deprecated option 'defaultRules' conflict with 'defaultRuler'")
      process.emitWarning(WARNING, 'DeprecationWarning')
      this.defaultRuler = o.defaultRules
    }
    //  Ensure we have ruler instance.
    if (!((o = this.defaultRuler) instanceof Ruler)) {
      this.defaultRuler = new Ruler(o ? [DO_SKIP, o] : DO_SKIP)
    }
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

    if (!locals.ruler) {
      locals.ruler = this.defaultRuler
      locals.ancestors = undefined
    }
    return res
  }

  onEnd (ctx) {
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
    const { locals, name, type } = ctx
    let action = DISCLAIM, ancestors

    if (locals.ruler) {
      [action, ancestors] = locals.ruler.test(name, locals.ancestors)
    }
    switch (action) {
      case CONTINUE:
      case DISCLAIM:
        //  Forward our rule parsing context to subdirectory.
        if (type === T_DIR) {
          return { ancestors, ruler: locals.ruler }
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
      res = this.options.onError.call(this, error, args, expected)
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
      const onError = closure.onError || this.onError

      if ((r = onError.call(this, error, args, expected)) === undefined) {
        if (expected.indexOf(error.code) >= 0) {
          this.registerFailure(error.message)
          return DO_SKIP
        }
        r = error
      }
      if (r instanceof Error) {
        (closure.error = r).args = args
        r = DO_TERMINATE
      }
      this.nextTick = Date.now() + this.interval
    }
    if (r === DO_TERMINATE) {
      this.terminate = true
    }
    return r
  }

  talk (...args) {
    //  istanbul ignore next
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

  /**
   * @param {string} rootPath
   * @param {Object} options
   * @returns {Object<{?error: Error}>}
   * @private
   */
  walk_ (rootPath, options) {
    const closure = defaults({}, options, this.options)
    const paths = [], root = resolve(rootPath)
    const onBegin = closure.onBegin || this.onBegin
    const onEnd = closure.onEnd || this.onEnd
    const onEntry = closure.onEntry || this.onEntry
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

      action = this.safely_(closure, onBegin,
        { absDir, depth, dir, locals, root })

      if (!(action <= DO_TERMINATE && action >= DO_SKIP)) {
        if ((t = Date.now()) > this.nextTick) {
          this.nextTick = Infinity
          this.tick()
          this.nextTick = t + this.interval
        }

        while ((entry = directory.readSync())) {
          const name = entry.name, type = getType(entry)

          action = this.safely_(closure, onEntry,
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

      action = this.safely_(closure, onEnd,
        { absDir, action, depth, dir, locals, root })

      if (action === DO_ABORT) {
        break
      }
    }       //  end while (paths...)
    return closure
  }
}

module.exports = Walker
