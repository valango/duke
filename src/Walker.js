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
 * @property {?Object} current entry in {@link Walker#trees}.
 * @property {*} data to be returned by {@link Walker#walkSync} method.
 * @property {number} depth 0 for `rootDir`.
 * @property {function(...)} detect plugin or instance method.
 * @property {string} dir relative to `rootDir`.
 * @property {?string} name of directory entry (onEntry only)
 * @property {string} rootDir absolute path where walking started from.
 * @property {Ruler} ruler currently active Ruler instance.
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
     * @type {function(string, *, *)}
     */
    this.trace = this.options.trace || (() => undefined)
    /**
     * Descriptors of recognized filesystem subtrees.
     * @type {Array<{Object}>}
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
   * Probably the `context.current` should be added to `trees`, to.
   * NB: in most cases, this method should _not_ be called from overriding one!
   * @param {TWalkContext} context
   * @returns {*} - non-numeric value has no effect on Walker#onBegin.
   */
  //  istanbul ignore next
  detect (context) {
  }

  /**
   * Descriptor of expected (recoverable) errors.
   * @type {{opendir: {EPERM, ENOTDIR, ELOOP, EACCES, ENOENT, EBADF}}}
   */
  get expectedErrors () {
    return exports.expected
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
   * Get total counts.
   * @returns {{directories: number, entries: number}}
   */
  static getTotals () {
    return { directories, entries }
  }

  /**
   * Handler called after new directory was successfully opened.
   *
   * @param {TWalkContext} context
   * @returns {number}
   */
  onBegin (context) {
    const { absDir } = context
    let action = 0, r

    //  Check if directory is already done - may happen when multi-threading.
    if (this.getCurrent(absDir)) {
      return DO_SKIP
    }

    //  If we are at root, then check rules as normally done by onEntry().
    if (context.dir === '') {
      action = (r = context.ruler).check(context.rootDir.split(sep).pop())
      if (action >= DO_SKIP) return action
      context.ruler = r.clone(true)
    }
    if (!context.current || this.options.nested) {
      action = context.detect.call(this, context)
      this.trace('detect', context, action)
    }

    return typeof action === 'number' ? action : 0
  }

  /**
   * Handler called when done with current directory.
   *
   * @param {TWalkContext} context - has `action` from `onBegin` or last `onEntry`.
   * @returns {number}
   */
  onEnd (context) {
    return typeof context.action === 'number' ? context.action : 0
  }

  /**
   * Handler called for every directory entry.
   * @param {TWalkContext} context - has `name` and `type` properties set.
   * @returns {number}
   */
  onEntry (context) {
    const { name, ruler, type } = context

    return ruler.check(name, type)
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
   * Execute a probe function or opendir, handle expected errors.
   * @param {function(...)} method
   * @param {Object|string} context or directory path.
   * @param {function(...)} onError
   * @param {Array<string>=} expected error codes
   * @returns {*} directory object or numeric action code
   * @throws {Error} which was not handled.
   * @private
   */
  execute_ (method, context, onError, expected) {
    let r

    try {
      r = method.call(this, context)
    } catch (error) {
      r = onError.call(this, error, context, expected)
      this.trace('onError', { context, error }, r)

      if (r === undefined) {
        if ((r = (expected && expected[error.code])) === undefined) {
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
    if (typeof context !== 'string') {  //  A probe should return numeric action code.
      this.assert(typeof r === 'number', 'Walker.execute_', 'not a number %O', r)
    }
    return r
  }

  /**
   *  Process directory tree asynchronously width-first starting from `rootPath`
   *  and invoke appropriate onXxx method.
   *
   * @param {string} rootPath
   * @param {TWalkOptions=} walkOptions
   * @returns {Promise<Array>} the first item is data returned by walkSync().
   */
  walk (rootPath, walkOptions = undefined) {
    /** @type {TWalkOptions} */
    const options = { ...this.options, ...walkOptions }

    if (!options.promises) options.promises = []

    return new Promise((resolve, reject) => {
      options.promises.unshift(this.walkSync(rootPath, options))

      return Promise.all(options.promises).then(resolve).catch(reject)
    })
  }

  /**
   *  Process directory tree synchronously width-first starting from `rootPath`
   *  and invoke appropriate onXxx methods.
   *
   * @param {string} rootPath
   * @param {TWalkOptions=} walkOptions
   * @returns {Object} 'data` member of internal context.
   */
  walkSync (rootPath, walkOptions = undefined) {
    this.assert(!rootPath || typeof rootPath === 'string', 'walkSync',
      "'rootPath' must be string")
    const options = { ...this.options, ...walkOptions }
    const rootDir = options.rootDir = resolve(rootPath || '.')
    const expErrs = this.expectedErrors
    const onBegin = options.onBegin || this.onBegin
    const onEnd = options.onEnd || this.onEnd
    const onEntry = options.onEntry || this.onEntry
    const onError = options.onError || this.onError
    const promises = options.promises
    let action, data = options.data || {}, directory, entry, t
    let notRoot = parse(rootDir).root !== rootDir
    let fifo = [{
      /* eslint-disable */
      data, depth: 0, detect: options.detect || this.detect, dir: '',
      rootDir, ruler: this.defaultRuler
      /* eslint-enable */
    }]

    while (fifo.length && !this.terminate) {
      const context = fifo.shift()

      if (promises) context.promises = promises
      data = context.data
      context.absDir = rootDir + context.dir

      if (typeof (directory = this.execute_(opendirSync, context.absDir, onError,
        expErrs.opendir)) === 'number') {  //  opendir failed -> action
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
        action = this.execute_(onBegin, context, onError, expErrs.onBegin)
        this.trace('onBegin', context, action)
      }
      if (action < DO_SKIP) {
        do {
          try {
            if (!(entry = directory.readSync())) {
              action = 0
              break       //  No more entries in directory.
            }
          } catch (error) /* istanbul ignore next */ {
            if (error.code !== 'EBADF') throw error
            action = DO_ABORT
            this.registerFailure(error.message)
            break
          }

          context.name = entry.name
          context.type = entryType(entry)
          entries += 1

          action = this.execute_(onEntry, context, onError, expErrs.onEntry)
          this.trace('onEntry', context, action)

          if (context.type === T_DIR && !(action >= DO_SKIP)) {
            const ctx = {
              ...context,
              depth: context.depth + 1,
              dir: context.dir + sep + context.name,
              ruler: context.ruler.clone(true)
            }
            delete ctx.name && delete ctx.type
            fifo.push(ctx)
          }
        } while (action <= DO_SKIP)        //  end of do
      }         //  end of if (action...)

      if (directory) directory.closeSync()

      context.action = action     //  Special to onEnd() handler only!
      action = this.execute_(onEnd, context, onError, expErrs.onEnd)
      this.trace('onEnd', context, action)

      if (action >= DO_ABORT) {   //  Discard all child directories
        const dir = context.dir + sep
        fifo = fifo.filter((p) => p.dir.indexOf(dir) !== 0)
      }
    }       //  end of while (fifo...)
    return data
  }
}

exports = module.exports = Walker

exports.expected = {
  opendir: {
    EACCES: DO_SKIP,
    EBADF: DO_ABORT,
    ELOOP: DO_SKIP,
    ENOENT: DO_SKIP,
    ENOTDIR: DO_SKIP,
    EPERM: DO_ABORT
  }
}
