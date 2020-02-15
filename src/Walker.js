'use strict'

const { opendirSync } = require('fs')
const { parse, resolve, sep } = require('path')
const { inspect } = require('util')
const Sincere = require('sincere')
const Ruler = require('./Ruler')
const entryType = require('./entry-type')
const { DO_ABORT, DO_SKIP, DO_TERMINATE, T_DIR } = require('./constants')

/**
 * Data context {@link Walker#walkSync} provides handler methods / plugins with.
 * @typedef {Object} TWalkContext
 * @property {string} absDir separator-terminated absolute path
 * @property {?number} action from previous or upper (for onBegin) handler.
 * @property {?Object} current entry in {@link Walker#trees}.
 * @property {*} data to be returned by {@link Walker#walkSync} method.
 * @property {number} depth 0 for `rootDir`.
 * @property {function(...)} detect plugin or instance method.
 * @property {string} dir relative to `rootDir`.
 * @property {?Object} master entry in {@link Walker#trees}.
 * @property {?string} name of directory entry (onEntry only)
 * @property {string} rootDir absolute path where walking started from.
 * @property {Ruler} ruler currently active ruler instance.
 * @property {?TEntryType} type of directory entry (onEntry only)
 */

/**
 * Options for Walker#walk...() instance methods and constructor.
 * @typedef {Object} TWalkOptions
 * @property {?*} data               to be shared between handlers.
 * @property {?function(...)} detect  plugin
 * @property {?function(...)} onBegin plugin
 * @property {?function(...)} onEnd   plugin
 * @property {?function(...)} onEntry plugin
 * @property {?function(...)} onError plugin
 * @property {?Array<Promise>} promises for async walk() method only.
 */

/**
 * Total number of directories and directory entries processed.
 * @type {number}
 * @private
 */
let directories = 0, entries = 0

/**
 *  Walks a directory tree according to rules.
 */
class Walker extends Sincere {
  /**
   * @param {Object=} options all {@link TWalkOptions} properties,
   * plus initial values for appropriate instance properties:
   * @property {?*} defaultRuler
   * @property {?number} interval msecs between tick plugin calls
   * @property {?function(number=, number=)} tick plugin
   * @property {?function(...)} trace plugin
   */
  constructor (options = undefined) {
    let o = { ...options }
    super()
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
     * Minimum interval between {@link Walker#tick} calls.
     * @type {number}
     */
    this.interval = o.interval || 200
    /**
     * Options to be applied to walkSync() by default.
     * @type {Object}
     */
    this.options = o
    /**
     * When true, walking will terminate immediately.
     * @type {boolean}
     */
    this.terminate = false
    /**
     * Function to be called approximately periodically while walking
     * with (entriesTotal, directoriesTotal) as arguments.
     * @type {function(number, number)}
     */
    this.tick = this.options.tick || (() => undefined)
    /**
     * Tracer plugin function called after every handler with
     * (handlerName, context, action).
     * A pseudo name 'noOpen' is used after opendir failure.
     * @type {function(name:string, context:*, action:*)}
     */
    this.trace = this.options.trace || (() => undefined)
    /**
     * Descriptors of recognized filesystem subtrees.
     * @type {Array<{absDir:string}>}
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
   * @param {TWalkContext} context
   * @param {number|undefined} action - set by dir entry rule (missing at root).
   * @returns {*} - a truey value on positive detection.
   */
  //  istanbul ignore next
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
   * @param {TWalkContext} context - may have it's `action` property set!
   * @returns {number|*}
   */
  onBegin (context) {
    const { absDir } = context
    let act = context.action, r

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
      act = (r = context.ruler).match(context.rootDir.split(sep).pop())
      context.ruler = r.clone(act)
      act = act[0][0]
    }
    r = context.detect.call(this, context, act)
    this.trace('detect', context, r)

    if (context.current) {
      context.master = undefined
      this.trees.push(context.current)
    } else {  //  Nothing was detected.
      context.current = context.master
    }
    return r
  }

  /**
   * Handler called when done with current directory.
   *
   * @param {TWalkContext} context - has `action` set by onBegin or last onEntry.
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
   * @param {TWalkContext} context - has `name` and `type` properties set.
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
   * @param {*} context
   * @param {Object} expected resulting actions keyed by error code.
   * @returns {*}
   *  - undefined: do default handling;
   *  - Error instance: treat this as unrecoverable
   *  - other: DO_SKIP, DO_ABORT, DO_TERMINATE
   */
  //  istanbul ignore next
  onError (errorInstance, context, expected) {
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

  /**
   * Execute a function, handle expected errors.
   * @param {function(...)} method
   * @param {*} context or argument
   * @param {function(...)} onError
   * @param {Array<string>=} expected error codes
   * @returns {number} action code
   * @throws {Error} which was not handled.
   * @private
   */
  safely_ (method, context, onError, expected) {
    let r

    try {
      r = method.call(this, context)
    } catch (error) {
      r = onError.call(this, error, context, expected)
      this.trace('onError', { context, error }, r)

      if (r === undefined) {
        if ((r = (expected || {})[error.code]) === undefined) {
          r = error
        } else {
          this.registerFailure(error.message)
        }
      }
      if (typeof r !== 'number') {
        const e = r instanceof Error ? r : error
        e.message += '\ncontext: ' + inspect(context)
        throw e
      }
      this._nextTick = Date.now() + this.interval
    }
    if (r === DO_TERMINATE) {
      this.terminate = true
    }
    return r
  }

  /**
   *  Process directory tree asynchronously width-first starting from `rootPath`
   *  and invoke appropriate onXxx method.
   *
   * @param {string} rootPath
   * @param {TWalkOptions=} options
   * @returns {Promise<Array>} the first item is data returned by walkSync().
   */
  walk (rootPath, options = undefined) {
    const closure = { ...this.options, ...options }

    if (!closure.promises) closure.promises = []

    return new Promise((resolve, reject) => {
      closure.promises.unshift(this.walkSync(rootPath, closure))

      return Promise.all(closure.promises).then(resolve).catch(reject)
    })
  }

  /**
   *  Process directory tree synchronously width-first starting from `rootPath`
   *  and invoke appropriate onXxx methods.
   *
   * @param {string} rootPath
   * @param {TWalkOptions=} options
   * @returns {Object} 'data` member of internal context.
   */
  walkSync (rootPath, options = undefined) {
    this.assert(!rootPath || typeof rootPath === 'string', 'walkSync',
      "'rootPath' must be string")
    const closure = { ...this.options, ...options }
    const rootDir = closure.rootDir = resolve(rootPath || '.')
    const onErrors = exports.onErrors || {}
    const paths = []
    const onBegin = closure.onBegin || this.onBegin
    const onEnd = closure.onEnd || this.onEnd
    const onEntry = closure.onEntry || this.onEntry
    const onError = closure.onError || this.onError
    const promises = closure.promises
    let action, data = closure.data || {}, directory, entry, t
    let notRoot = parse(rootDir).root !== rootDir

    //  Push initial context to FIFO.
    paths.push({
      /* eslint-disable */
      data, depth: 0, detect: closure.detect || this.detect, dir: '',
      rootDir, ruler: this.defaultRuler
      /* eslint-enable */
    })

    while (paths.length && !this.terminate) {
      const length = paths.length
      const context = paths.shift()

      if (promises) context.promises = promises
      data = context.data
      context.absDir = rootDir + context.dir

      if (typeof (directory = this.safely_(opendirSync, context.absDir, onError,
        onErrors.opendir)) === 'number') {  //  opendir failed -> action
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

        notRoot = true
        action = this.safely_(onBegin, context, onError, onErrors.onBegin)
        this.trace('onBegin', context, action)
      }
      if (!(action >= DO_SKIP)) {
        while (true) {
          action = undefined
          try {
            if (!(entry = directory.readSync())) break
          } catch (error) /* istanbul ignore next */ {
            if (error.code !== 'EBADF') throw error
            action = DO_ABORT
            this.registerFailure(error.message)
          }
          if (!action) {
            context.name = entry.name
            context.type = entryType(entry)

            entries += 1
            action = this.safely_(onEntry, context, onError, onErrors.onEntry)
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
              ctx.data = action.data || ctx.data
              ctx.ruler = action.ruler || ctx.ruler
            }
            this.trace('push', ctx, action)
            paths.push(ctx)
          }
        }         //  end of while (entry...)
      }         //  end of if (action...)
      if (directory) directory.closeSync()

      context.action = action   //  Special to this handler only.
      action = this.safely_(onEnd, context, onError, onErrors.onEnd)
      this.trace('onEnd', context, action)

      if (action >= DO_ABORT) {
        paths.splice(length, paths.length)
        break
      }
    }       //  end while (paths...)
    return data
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
