'use strict'

// const fs = require('fs')
const { resolve, sep } = require('path')
const { format } = require('util')
// const Sincere = require('sincere')
// const translateDirEntry = require('./translateDirEntry')
const Ruler = require('./Ruler')
const { DO_ABORT, DO_NOTHING, DO_SKIP, DO_TERMINATE, T_DIR } = require('./constants')
const nothing = Symbol('nothing')
const noop = () => undefined
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
   * When truish, walking will terminate immediately.
   * @type {*}
   */
  this.terminate = undefined
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

Walker.prototype.onFinal = function () {
  return 0
}

/**
 * Handler called when error gets trapped.
 * @param {Error} errorInstance
 * @param {Object} context
 * @param {Array} args
 * @param {Object} expected resulting actions keyed by error code.
 * @param {[]} args
 * @returns {*}
 *  - undefined: do default handling;
 *  - Error instance: treat this as unrecoverable
 *  - other: DO_SKIP, DO_ABORT, DO_TERMINATE
 */
//  istanbul ignore next
Walker.prototype.onError = function (errorInstance, context, args, expected) {
}

/**
 * Accumulate all kind of stuff into `failures` array to be enjoyed
 * when the walk is over.
 *
 * @param {Error} error - presumably error instance or string.
 * @param {Object=} context - if present, will be added with newline.
 * @returns {Walker}
 */
Walker.prototype.registerFailure = function (error, context) {
  if (context) error.context = context
  this.failures.push(error)
  return this
}

/**
 * Reset counters for getTotals().
 */
Walker.prototype.reset = function (data = nothing) {
  this.data = data === nothing ? {} : data
  this.failures = []
  this.terminate = undefined
  this.visited.clear()
  this._nEntries = 0
  return this
}

/**
 * Do default error handling: register expected error and replacing return value.
 * @param {Error} error
 * @param {Object} context
 * @param {Array} args
 * @param {*} value - to be returned in case of expected error.
 * @returns {*}     - error instance if it was not handled.
 * @private
 */
Walker.prototype.onError_ = function (error, context, args, value = DO_NOTHING) {
  const expected = exports.expected[context.locus]
  //  Todo: define clearly the purpose and behavior of .onError()
  let r = this.onError(error, context, args, expected)

  if (r === undefined) {
    error.context = { ...context, args }

    if ((r = (expected && expected[error.code])) === undefined) {
      r = error
    } else {
      this.failures.push(error)
      if (r === null) r = value
    }
  }
  return r
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
  const data = opts.data === nothing ? {} : opts.data
  const rootPath = resolve(startPath || '.')
  const onDir = opts.onDir || this.onDir
  const onEntry = opts.onEntry || this.onEntry
  const onFinal = opts.onFinal || this.onFinal
  const tick = opts.tick || this.tick || noop
  const trace = opts.trace || this.trace || noop
  const { interval } = this
  let threads = 0, t
  const fifo = [{
    absPath: undefined,
    data,
    depth: 0,
    dirPath: '',
    locus: undefined,
    rootPath,
    ruler: opts.ruler || this.ruler
  }]
  const { opendir } = exports

  const return_ = value => {
    if (threads === undefined) return
    console.log('return_')
    threads = undefined         //  Disable any future processing
    callback(null, value)
  }

  const fail_ = error => {
    if (threads === undefined) return
    console.log('fail_')
    threads = undefined         //  Disable any future processing
    callback(error)
    return DO_ABORT
  }

  const execute_ = (method, context, ...args) => {
    let r

    if (threads === undefined) {
      return Promise.resolve(DO_ABORT)
    }
    try {
      threads += 1
      r = method.apply(this, args)
    } catch (error) {     //  Todo: verify the proper handling of unexpected errors!
      r = this.onError_(error, context, args)
    }

    if (!(r instanceof Promise)) r = r instanceof Error ? Promise.reject(r) : Promise.resolve(r)

    return r
      .catch(e => {
        let v = this.onError_(e, context, args)
        if (v instanceof Error) {
          v = fail_(v)
        }
        return v
      })
      .then(v => {
        if (v === DO_TERMINATE) {
          this.terminate = context
        }
        if (typeof v !== 'number' && ['opendir', 'onDir'].indexOf(context.locus) < 0) {
          const error = new Error(format('Walker.execute_: bad return value %O', v))
          error.context = { ...context, args }
          return fail_(error)
        }
        if (threads !== undefined) threads -= 1
        return v
      })
  }

  const doDirs = () => {
    if (fifo.length === 0 && threads <= 0) {
      console.log('fifo.length')
      return return_(data)
    }

    for (let context; (context = fifo.shift()) !== undefined;) {
      console.log('shift', context.dirPath)
      if (this.terminate !== undefined) {
        console.log('this.terminate')
        return return_(data)
      }

      const path = rootPath + context.dirPath
      context.absPath = (context.dirPath || !/\/$/.test(path)) ? path + sep : path

      if (this.visited.has(context.absPath)) {
        trace(context)
        continue
      }

      ++threads
      this.scanDir_(context, { onDir, onEntry }, fail_).then(r => {
        --threads
        if (typeof r === 'object') {
          const { context, entries } = r

          this._nEntries += 1
          //  Process a directory.
          if ((t = Date.now()) > this._nextTick) {
            this._nextTick = t + interval
            tick(this._nEntries)
          }

          context.locus = 'onFinal'
          execute_(onFinal, context, context, entries).then(action => {
            trace(context, action, entries)
            context.locus = 'push'

            if (action < DO_SKIP) {
              for (let i = 0, entry; (entry = entries[i]) !== undefined; i += 1) {
                if (entry.type === T_DIR) {
                  const ctx = {
                    ...context,
                    depth: context.depth + 1,
                    dirPath: context.dirPath + sep + entry.name,
                    ruler: context.ruler.clone(true)
                  }
                  fifo.push(ctx)
                  console.log('push', ctx.dirPath, fifo.length)
                }
              }
              console.log('pushed', fifo.length)
            } else if (action instanceof Error) {
              return fail_(action)
            }
          })
        }
      }).catch(e => {
        console.log('ERR', e)
      })
    }
    // console.log('tick', threads)
    // if (threads !== undefined) process.nextTick(doDirs)
  }
  doDirs()
  console.log('initiated')
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
  closedir: {
    ERR_DIR_CLOSED: null
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

// exports.opendir = fs.promises.opendir

Walker.prototype.scanDir_ = require('./scanDir')()
