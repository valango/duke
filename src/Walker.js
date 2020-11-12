'use strict'

const { resolve, sep } = require('path')
const fs = require('fs')
const translateDirEntry = require('./translateDirEntry')
const Ruler = require('./Ruler')
const { DO_ABORT, DO_NOTHING, DO_RETRY, DO_SKIP, DO_TERMINATE, T_DIR } = require('./constants')
const nothing = Symbol('nothing')
const { isNaN } = Number
const noop = () => undefined
const shadow = { reject: undefined, resolve: undefined }

/**
 * Data context {@link Walker#walk} provides handler methods / plugins with.
 * @typedef {Object} TWalkContext
 * @property {string} absPath         separator-terminated absolute path
 * @property {?Object} current        entry in {@link Walker#visited}.
 * @property {*} data                 to be returned by {@link Walker#walk} method.
 * @property {number} depth           0 for `rootDir`.
 * @property {string} dirPath         relative to `rootDir`.
 * @property {string} locus           used for diagnostics and execute_().
 * @property {string} rootPath        absolute path where walking started from.
 * @property {Ruler} ruler            currently active Ruler instance.
 * @property {number} threadCount
 */

/**
 * Options for Walker#walk...() instance methods and constructor.
 * @typedef {Object} TWalkOptions
 * @property {*} [data]               to be shared between handlers.
 * @property {function(Object)} [onDir]   plugin
 * @property {function(Object,Object)} [onEntry]  plugin
 * @property {function(Object,Object[])} [onFinal] plugin
 * @property {function(...)} [tick]    plugin
 * @property {function(...)} [trace]   plugin
 * @property {Ruler} [ruler]            currently active Ruler instance.
 */

/**
 * Total number of directories and directory entries processed.
 * @type {number}
 * @private
 */

// let directories = 0, entries = 0

/**
 * @param {Object=} options all {@link TWalkOptions} properties,
 * plus initial values for appropriate instance properties:
 * @property {?*} defaultRuler
 * @property {?number} interval msecs between tick plugin calls
 * @property {?function(number=, number=)} tick plugin
 * @property {?function(...)} trace plugin
 */
function Walker (options = {}) {
  this.data = undefined
  /**
   * Array of error messages from suppressed exceptions.
   * @type {Array<Error>}
   */
  this.failures = undefined
  /**
   * Minimum interval between {@link Walker#tick} calls.
   * @type {number}
   */
  this.interval = options.interval || 200
  /**
   * @type {Ruler}
   */
  this.ruler = options.rules instanceof Ruler ? options.rules : new Ruler(options.rules)
  /**
   * Global Terminal Condition, unless undefined.
   * @type {*}
   */
  this.termination = undefined
  /**
   * Descriptors of recognized filesystem subtrees.
   * @type {Map}
   */
  this.visited = new Map()
  /**
   * For launching the `tick()` method.
   * @type {number}
   * @private
   */
  this._nextTick = 0

  this._nEntries = 0

  this.reset(({ data: nothing, ...options }).data)
}

/**
 * Get descriptor for the current directory if it was recognized.
 * @param {string} dir
 * @returns {{absDir, '...'}|undefined}
 */

Walker.prototype.getCurrent = function (dir) {  //  Todo: we need this?
  return this.trees.find((p) => p.absDir === dir)
}

/**
 * Get total counts.
 * @returns {Object}
 */
Walker.prototype.getTotals = function () {
  return { entries: this._nEntries }
}

Walker.prototype.onDir = function (context) {
  return 0
}

/**
 * Handler called for every directory entry.
 * @param {TWalkContext} context - has `name` and `type` properties set.
 * @returns {number}
 */
Walker.prototype.onEntry = function (context, { name, type }) {
  return context.ruler.check(name, type)
}

Walker.prototype.onFinal = async function () {
  return 0
}

/**
 * Translate error if applicable.
 * @param {Error} error
 * @param {string} locus
 * @returns {Error | number}
 *  - Error instance: treat this as unrecoverable
 *  - other: DO_SKIP, DO_ABORT, DO_TERMINATE
 */
Walker.prototype.onError = function (error, locus) {
  let override = exports.expected[locus]  //  Todo: better provide context argument here!

  if (override && (override = override[error.code]) !== undefined) {
    if (override !== DO_NOTHING) this.failures.push(error)
    return override
  }
  return error
}

/**
 * Reset counters for getTotals().
 */
Walker.prototype.reset = function (data = nothing) {
  this.data = data === nothing ? {} : data
  this.failures = []
  this.termination = undefined
  this.visited.clear()
  this._nEntries = 0
  return this
}

Walker.prototype.checkReturn_ = function (value, context, closure) {
  if (value && typeof value !== 'number') {
    value = closure.end(null, value)
  } else if (value === DO_TERMINATE) {
    value = closure.end(null, context.data) || this.terminate_(context)
  }
  return value
}

/**
 * Execute an asynchronous call and handle possible rejections.
 * @param fn
 * @param {TWalkContext} context
 * @param {Object} closure
 * @param args
 * @returns {Promise<*>}
 * @private
 */
Walker.prototype.execAsync_ = function (fn, context, closure, ...args) {
  return fn.apply(this, args)
    .catch(error => {
      return this.onError_(error, fn, context, closure, args)
    })
    .then(value => {
      if (!isNaN(context.threadCount)) {
        if (fn.name !== 'opendir') {
          value = this.checkReturn_(value, context, closure)
        }
      }
      return value
    })
}

Walker.prototype.execSync_ = function (fn, context, closure, ...args) {
  let result

  try {
    result = fn.apply(this, args)
  } catch (error) {
    result = this.onError_(error, fn, context, closure, args)
  }
  return this.checkReturn_(result, context, closure)
}

/**
 * Handle error if possible, terminate/reject if necessary.
 * @private
 */
Walker.prototype.onError_ = function (error, fn, context, closure, args) {
  const locus = context.locus || fn.name

  error.context = { args, ...context, locus, ...shadow }

  let r = this.onError(error, locus)

  if (r === undefined) r = error

  if (r instanceof Error) {
    r = closure.end(r) || this.terminate_(context)
  }
  return r
}

Walker.prototype.terminate_ = function (context) {
  if (this.termination === undefined) {
    this.termination = context
  }
  return DO_ABORT
}

/**
 *  Process directory tree synchronously width-first starting from `rootPath`
 *  and invoke appropriate onXxx methods.
 *
 * @param {string} startPath
 * @param {TWalkOptions} opts
 * @param {function(*,*=)} callback
 */
Walker.prototype.walk_ = function (startPath, opts, callback) {
  const data = { ...opts.data }
  const rootPath = resolve(startPath || '.')
  const onDir = opts.onDir || this.onDir
  const onEntry = opts.onEntry || this.onEntry
  const onFinal = opts.onFinal || this.onFinal
  const tick = opts.tick || this.tick || noop
  const trace = opts.trace || this.trace || noop
  const { interval } = this
  const { opendir } = exports
  const closure = {
    end: function (error, value = null) {
      if (!isNaN(this.threadCount)) {
        this.threadCount = NaN
        callback(error, value)
      }
    },
    threadCount: 0
  }

  let t, doDirs = () => undefined

  const fifo = [{
    absPath: undefined,
    data,
    depth: 0,
    entries: undefined,
    dirPath: '',
    locus: undefined,
    rootPath,
    ruler: opts.ruler || this.ruler
  }]

  const doDir = async (context) => {
    let res, pushed

    // Todo: fix vague semantics of directory paths!
    if (context.entries === undefined) {      //  We are in new directory.
      const path = rootPath + context.dirPath, entries = []

      context.absPath = (context.dirPath || !/\/$/.test(path)) ? path + sep : path

      if (this.visited.has(context.absPath)) {
        return
      }

      closure.threadCount += 1
      let dir, entry

      res = await this.execAsync_(opendir, context, closure, context.absPath)

      if (typeof res !== 'object') {
        if (res === DO_RETRY) {
          fifo.push(context)        //  Todo: extra checks here!
        }
      } else {
        dir = res
        if (!((res = this.execSync_(onDir, context, closure, context))) < DO_SKIP) {
          for await (entry of dir) {
            entry = translateDirEntry(entry)
            res = this.execSync_(onEntry, context, closure, context, entry)
            if (!(res < DO_ABORT)) break
            if (res < DO_SKIP) entries.push(entry)
          }
        }
        try {
          await dir.close()
        } catch (error) {
          res = Math.max(res, this.onError_(error, dir.close, context, closure, []))
        }
        this.checkReturn_(res, context, closure)
      }
      if (isNaN(closure.threadCount || this.termination)) {
        return
      }
      if (res < DO_ABORT) {
        context.entries = entries
        fifo.push(context)
      }
      closure.threadCount -= 1
    } else {  //  Phase II
      closure.threadCount += 1
      if ((res = await this.execAsync_(onFinal, context, closure, context)) < DO_SKIP) {
        const { dirPath, entries } = context
        for (let i = 0, entry; (entry = entries[i]) !== undefined; i += 1) {
          if (entry.type !== T_DIR) continue
          const ctx = {
            ...context,
            depth: context.depth + 1,
            dirPath: dirPath ? dirPath + sep + entry.name : entry.name,
            entries: undefined,
            ruler: context.ruler.clone(true)
          }
          pushed = fifo.push(ctx)
        }
      }
      closure.threadCount -= 1
    }
    console.log(context.dirPath || '.', fifo.length, closure.threadCount)
    setTimeout(doDirs, 0)
  }

  doDirs = () => {
    for (let context; (context = fifo.shift()) !== undefined;) {
      doDir(context)  //  Yes - the returned promise is ignored!
    }
    if (closure.threadCount === 0) {
      closure.end(null, data)
    }
  }

  doDirs()
}

/**
 * @param {string} startPath
 * @param {TWalkOptions} options
 * @returns {Promise<*>}
 */
Walker.prototype.walk = function (startPath, options = {}) {
  return new Promise((resolve, reject) =>
    this.walk_(startPath, options, (error, data) => error
      ? reject(error)
      : resolve(data))
  )
}

exports = module.exports = Walker

exports.expected = {
  close: {
    ERR_DIR_CLOSED: DO_NOTHING
  },
  opendir: {
    EACCES: DO_SKIP,
    EBADF: DO_ABORT,
    ELOOP: DO_SKIP,
    ENOENT: DO_TERMINATE,
    ENOTDIR: DO_SKIP,
    EPERM: DO_ABORT
  }
}

exports.opendir = fs.promises.opendir

/**
 * Process the directory defined by `context`.
 * @param {Object} context
 * @param {function(Object):number} onDir
 * @param {function(Object):number} onEntry
 * @param {function(*)} fail_
 * @returns {Promise<{entries: [], context: *, action: *}|*>}
 * @async
 * @private
 */
// Walker.prototype.scanDir_ = require('./scanDir')()
