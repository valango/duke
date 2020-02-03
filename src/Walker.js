'use strict'

const expectedOnOpendir = ['EACCES', 'ELOOP', 'ENOENT', 'ENOTDIR', 'EPERM']

const { opendirSync } = require('fs')
const { resolve, sep } = require('path')
const Sincere = require('sincere')
const Ruler = require('./Ruler')
const entryType = require('./entry-type')
const { DO_ABORT, DO_SKIP, DO_TERMINATE, T_DIR } = require('./definitions')

let count = 0     //  Used by tick() plugin.

/**
 *  Walks a directory tree according to rules.
 */
class Walker extends Sincere {
  /**
   * @param {Object<{tick,interval}>} options may also contain on...() plugins.
   * @param {*=} sharedData - may be used by derived classes.
   */
  constructor (options, sharedData = undefined) {
    let o = { ...options }
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
     * @type {Array<Promise>}
     */
    this.promises = []
    /**
     * When true, walking will terminate immediately.
     * @type {boolean}
     */
    this.terminate = false
    /**
     * Function to be called every `this.interval` while walking.
     * @type {function(number)}
     */
    this.tick = this.options.tick || (() => undefined)

    /**
     * Tracer API.
     * @type {function(...)}
     */
    this.trace = this.options.trace || (() => undefined)
    /**
     * Descriptors of recognized filesystem subtrees.
     * @type {Array<{absDir}>}
     */
    this.trees = []

    //  Ensure we have ruler instance.
    if (!((o = this.defaultRuler) instanceof Ruler)) {
      this.defaultRuler = new Ruler(o ? [DO_SKIP, o] : DO_SKIP)
    }
  }

  /**
   * Check if the current directory should be recognized as special.
   * NB: in most cases, this method should _not_ be called from overriding one!
   * @param {Object} context
   * @returns {*}
   */
  detect (context) {
  }

  /**
   * Get descriptor for the current directory if it was recognized.
   * @param {string} dir
   * @returns {{absDir, '...'}|undefined}
   */
  getCurrent (dir) {
    return this.trees.find((p) => p.absDir === dir)
  }

  /**
   * Find tree above the current directory.
   * @param {string} dir
   * @returns {{absDir, '...'}|undefined}
   */
  getMaster (dir) {
    return this.trees.find(
      (p) => dir.indexOf(p.absDir) === 0 && dir !== p.absDir
    )
  }

  onBegin (ctx) {
    const { absDir, detect } = ctx

    //  Check if already done - may happen when multi-threading.
    if (this.getCurrent(absDir)) {
      return DO_SKIP
    }

    if ((ctx.master = this.getMaster(absDir))) {
      if (!this.options.nested) {
        ctx.current = ctx.master
        return
      }
    }

    const res = detect.call(this, ctx)  //  May set ctx.current
    this.trace('detect', ctx, res)

    if (ctx.current) {
      ctx.master = undefined
      this.trees.push(ctx.current)
    } else {  //  Nothing was detected.
      ctx.current = ctx.master
    }
    return res
  }

  //  NB: here we have ctx.action too.
  onEnd (ctx) {
    if (ctx.current) {
      if (!ctx.master) {
        return 0
      }
      return DO_SKIP
    }
  }

  onEntry (ctx) {
    count += 1
    const { name, ruler, type } = ctx

    const matches = ruler.match(name, type)
    const action = matches[0][0]

    if (type === T_DIR && !(action >= DO_SKIP)) {
      return { action, ruler: ruler.clone(matches) }
    }
    return action
  }

  /**
   *
   * @param {Error} errorInstance
   * @param {*} args
   * @param {Array<string>} expected
   * @returns {*}
   *  - undefined: do default handling;
   *  - Error instance: treat this as unrecoverable
   *  - other: DO_SKIP, DO_ABORT, DO_TERMINATE
   */
  //  istanbul ignore next
  onError (errorInstance, args, expected) {
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

  static getCount () {
    return count
  }

  static reset () {
    count = 0
  }

  //  Execute a function or handler, catching possible errors.
  //  Do default error handling.
  //
  safely_ (closure, func, argument, expected = []) {
    let r

    try {
      r = func.call(this, argument)
    } catch (error) {
      const onError = closure.onError || this.onError

      r = onError.call(this, error, argument, expected)
      this.trace('onError', { argument, error }, r)

      if (r === undefined) {
        if (expected.indexOf(error.code) >= 0) {
          this.registerFailure(error.message)
          return DO_SKIP
        }
        r = error
      }
      if (r !== DO_SKIP) {
        const v = r instanceof Error ? r : error
        //  Remember the first error.
        if (!closure.error) (closure.error = v).argument = argument
        r = DO_TERMINATE
      }
      this.nextTick = Date.now() + this.interval
    }
    if (r === DO_TERMINATE) {
      this.terminate = true
    }
    return r
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

      if (res.error) {
        this.promises = []
        return reject(res.error)
      }
      Promise.all(this.promises).then(() => {
        resolve(res)
      })
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
    let root = rootPath, closure = options

    if (root && typeof root === 'object' && options === undefined) {
      (closure = root) && (root = undefined)
    }
    closure = { ...this.options, ...closure }
    closure.root = root = resolve(root || '.')

    const paths = []
    const onBegin = closure.onBegin || this.onBegin
    const onEnd = closure.onEnd || this.onEnd
    const onEntry = closure.onEntry || this.onEntry
    let action, directory, entry, t

    //  Put initial context to FIFO.
    paths.push({
      /* eslint-disable */
      depth: 0, detect: closure.detect || this.detect, dir: '',
      locals: closure.locals || {},
      root, ruler: this.defaultRuler
      /* eslint-enable */
    })

    while (paths.length && !this.terminate) {
      const length = paths.length
      const context = paths.shift(), notRoot = context.absDir !== sep

      context.absDir = root + context.dir

      if (typeof (directory = this.safely_(closure, opendirSync, context.absDir,
        expectedOnOpendir)) !== 'object') {
        this.trace('noOpen', context.absDir)
        continue
      }
      //  Handlers get `absDir` `sep` terminated!
      if (notRoot) context.absDir += sep
      if (context.absDir.indexOf('//') >= 0) throw Error('Bad absDir')

      action = this.safely_(closure, onBegin, context)
      this.trace('onBegin', context, action)

      if (!(action >= DO_SKIP)) {
        if ((t = Date.now()) > this.nextTick) {
          this.nextTick = Infinity
          this.tick(count)
          this.nextTick = t + this.interval
        }

        while (true) {
          action = undefined
          try {
            if (!(entry = directory.readSync())) break
          } catch (error) {
            if (error.code !== 'EBADF') throw error
            action = DO_ABORT
            this.registerFailure(error.message)
          }
          if (!action) {
            context.name = entry.name
            context.type = entryType(entry)

            action = this.safely_(closure, onEntry, context)
            this.trace('onEntry', context, action)
          }
          if (action === DO_ABORT || action === DO_TERMINATE) {
            paths.splice(length, paths.length)
            break
          } else if (context.type === T_DIR && action !== DO_SKIP) {
            const ctx = {
              ...context,
              action,
              depth: context.depth + 1,
              dir: context.dir + sep + context.name,
              master: undefined
            }
            if (ctx.dir.indexOf('//') >= 0) throw Error('Bad dir')
            if (typeof action === 'object') {
              ctx.action = action.action || undefined
              ctx.current = action.current || undefined   //  Todo: necessary?
              ctx.locals = action.locals || ctx.locals    //  Todo: necessary?
              ctx.ruler = action.ruler || ctx.ruler
            }
            this.trace('push', ctx, action)
            paths.push(ctx)
          }
        }         //  end of while (entry...)
      }         //  end of if (action...)
      directory.closeSync()

      context.action = action   //  Special to this handler only.
      action = this.safely_(closure, onEnd, context)
      this.trace('onEnd', context, action)

      if (action >= DO_ABORT) {
        break
      }
    }       //  end while (paths...)
    return closure
  }
}

module.exports = Walker
