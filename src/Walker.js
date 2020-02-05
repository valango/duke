'use strict'

const { opendirSync } = require('fs')
const { resolve, sep } = require('path')
const { inspect } = require('util')
const Sincere = require('sincere')
const Ruler = require('./Ruler')
const entryType = require('./entry-type')
const { DO_ABORT, DO_SKIP, DO_TERMINATE, T_DIR } = require('./definitions')

/**
 * Total number of directories and directory entries processed.
 * @type {number}
 */
let directories = 0, entries = 0

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
     * Default Ruler instance to be used until detect() finds something special.
     * @type {*|Ruler}
     */
    this.defaultRuler = o.defaultRuler
    /**
     * Array of error messages from suppressed exceptions.
     * @type {Array<string>}
     */
    this.failures = []
    /**
     * Minimum interval between this.tick() calls.
     * @type {number}
     */
    this.interval = o.interval || 200
    /**
     * Options to be applied to walkSync() by default.
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
     * @type {function(number=, number=)}
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
    /**
     * @type {number}
     * @private
     */
    this._nextTick = 0

    //  Ensure we have ruler instance.
    if (!((o = this.defaultRuler) instanceof Ruler)) {
      this.defaultRuler = new Ruler(o ? [DO_SKIP, o] : DO_SKIP)
    }
  }

  /**
   * Check if the current directory should be recognized as special and
   * if it does then assign new values to `context.current` and `context.ruler`.
   * NB: in most cases, this method should _not_ be called from overriding one!
   * @param {Object} context
   * @param {number|undefined} action - set by dir entry rule (missing at root).
   * @returns {*} - a truey value on positive detection.
   */
  detect (context, action) {
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

  /**
   * Get total counts.
   * @returns {{directories: number, entries: number}}
   */
  static getTotals () {
    return { directories, entries }
  }

  /**
   * Handler called after new directory was successfully opened.
   *
   * @param {Object} context - may have it's `action` property set!
   * @returns {number|*}
   */
  onBegin (context) {
    const { absDir, detect } = context
    let act = context.action

    delete context.action
    //  Check if already done - may happen when multi-threading.
    if (this.getCurrent(absDir)) {
      return DO_SKIP
    }

    if ((context.master = this.getMaster(absDir))) {
      if (!this.options.nested) {
        context.current = context.master
        return
      }
    }

    //  If we are at root, then check rules as normally done by onEntry().
    if (act === undefined && context.dir === '') {
      act = context.ruler.match(context.root.split(sep).pop())[0][0]
    }
    const res = detect.call(this, context, act)
    this.trace('detect', context, res)

    if (context.current) {
      context.master = undefined
      this.trees.push(context.current)
    } else {  //  Nothing was detected.
      context.current = context.master
    }
    return res
  }

  /**
   * Handler called when done with current directory.
   *
   * @param {Object} context - has `action` set by onBegin or last onEntry.
   * @returns {*}
   */
  onEnd (context) {
    if (context.action > DO_SKIP) return context.action
    if (context.current) {
      if (!context.master) {
        return 0
      }
      return DO_SKIP
    }
  }

  /**
   * Handler called for every directory entry.
   * @param {Object} context - has `name` and `type` properties set.
   * @returns {Object|number|undefined}
   */
  onEntry (context) {
    const { name, ruler, type } = context

    const matches = ruler.match(name, type)
    const action = matches[0][0]

    if (type === T_DIR && !(action >= DO_SKIP)) {
      return { action, ruler: ruler.clone(matches) }
    }
    return action
  }

  /**
   * Handler called when error gets trapped.
   * @param {Error} errorInstance
   * @param {*} args
   * @param {Object} expected resulting actions keyed by error code.
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

  /**
   * Reset counters for getTotals().
   */
  static reset () {
    directories = entries = 0
  }

  //  Execute a function or handler, catching possible errors.
  //  Do default error handling.
  //
  safely_ (closure, func, argument, expected) {
    let r

    try {
      r = func.call(this, argument)
    } catch (error) {
      const onError = closure.onError || this.onError

      r = onError.call(this, error, argument, expected)
      this.trace('onError', { argument, error }, r)

      if (r === undefined) {
        if ((r = (expected || {})[error.code]) === undefined) {
          r = error
        } else {
          this.registerFailure(error.message)
        }
      }
      if (typeof r !== 'number') {
        const v = r instanceof Error ? r : error
        //  Remember the first error.
        if (!closure.error) {
          (closure.error = v).argument = argument
          v.message += '\nARG: ' + inspect(argument)
        }
        r = DO_TERMINATE
      }
      this._nextTick = Date.now() + this.interval
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
      const res = this.walkSync(root, options)

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
   * @param {string} rootPath
   * @param {Object} options
   * @returns {Object<{?error: Error}>}
   */
  walkSync (rootPath, options = undefined) {
    let root = rootPath, closure = options

    if (root && typeof root === 'object' && options === undefined) {
      (closure = root) && (root = undefined)
    }
    closure = { ...this.options, ...closure }
    closure.root = root = resolve(root || '.')

    const onErrors = exports.onErrors || {}
    const paths = []
    const onBegin = closure.onBegin || this.onBegin
    const onEnd = closure.onEnd || this.onEnd
    const onEntry = closure.onEntry || this.onEntry
    let action, directory, entry, t

    //  Push initial context to FIFO.
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
        onErrors.opendir)) === 'number') {
        this.trace('noOpen', context.absDir, action = directory)
        directory = undefined
      } else {
        directories += 1

        if ((t = Date.now()) > this._nextTick) {
          this._nextTick = Infinity
          this.tick(entries, directories)
          this._nextTick = t + this.interval
        }
        //  Handlers get `absDir` `sep` terminated!
        if (notRoot) context.absDir += sep

        action = this.safely_(closure, onBegin, context, onErrors.onBegin)
        this.trace('onBegin', context, action)
      }
      if (!(action >= DO_SKIP)) {
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

            entries += 1
            action = this.safely_(closure, onEntry, context, onErrors.onEntry)
            this.trace('onEntry', context, action)
          }
          if (context.type === T_DIR && !(action >= DO_SKIP)) {
            const ctx = {
              ...context,
              action,
              depth: context.depth + 1,
              dir: context.dir + sep + context.name,
              master: undefined
            }
            // if (ctx.dir.indexOf('//') >= 0) throw Error('Bad dir')
            if (typeof action === 'object') {
              ctx.action = action.action || undefined
              ctx.current = action.current || undefined
              ctx.locals = action.locals || ctx.locals
              ctx.ruler = action.ruler || ctx.ruler
            }
            this.trace('push', ctx, action)
            paths.push(ctx)
          }
        }         //  end of while (entry...)
      }         //  end of if (action...)
      if (directory) directory.closeSync()

      context.action = action   //  Special to this handler only.
      action = this.safely_(closure, onEnd, context, onErrors.onEnd)
      this.trace('onEnd', context, action)

      if (action >= DO_ABORT) {
        paths.splice(length, paths.length)
        break
      }
    }       //  end while (paths...)
    return closure.error ? closure.error : {}
  }
}

exports = module.exports = Walker

exports.onErrors = {
  opendir: {
    EACCES: DO_SKIP,
    EBADF: DO_ABORT,
    ELOOP: DO_SKIP,
    ENOENT: DO_SKIP,
    ENOTDIR: DO_SKIP,
    EPERM: DO_ABORT
  }
}
