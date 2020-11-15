'use strict'

const { resolve, sep } = require('path')
const fs = require('fs')
const translateDirEntry = require('./translateDirEntry')
const Ruler = require('./Ruler')
const { DO_ABORT, DO_NOTHING, DO_RETRY, DO_SKIP, DO_HALT, T_DIR } = require('./constants')
const nothing = Symbol('nothing')
const { isNaN } = Number
const noop = () => undefined

/**
 * @param {TWalkerOptions=} options
 * @constructor
 */
function Walker (options = {}) {
  this.data = undefined
  /**
   * Array of error instances (with `context` property) from overridden exceptions.
   * @type {Array<Error>}
   */
  this.failures = undefined
  /**
   * Minimum milliseconds between {@link Walker#tick} calls (default: 200).
   * @type {number}
   */
  this.interval = options.interval || 200
  /**
   * @type {Ruler}
   */
  this.ruler = options.rules instanceof Ruler ? options.rules : new Ruler(options.rules)
  /**
   * Global Terminal Condition, unless undefined.
   * @type {TWalkContext}
   */
  this.halted = undefined
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
  /**
   * @type {number}
   * @private
   */
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
 * @returns {Object.<{entries: number}>}
 */
Walker.prototype.getTotals = function () {
  return { entries: this._nEntries }
}

/**
 * Handler called immediately after directory has been opened.
 * @param {TWalkContext} context
 * @param {*=} currentValue
 * @returns {*}  numeric action code or special value to for `visited` collection.
 */
Walker.prototype.onDir = function (context, currentValue = nothing) {
  context.current = currentValue === nothing ? {} : currentValue
  return DO_NOTHING
}

/**
 * Handler called for every directory entry.
 * @param {string} name
 * @param {TEntryType} type
 * @param {TWalkContext} context
 * @returns {number}
 */
Walker.prototype.onEntry = function ({ name, type }, context) {
  return context.ruler.check(name, type)
}

/**
 * Handler called after all entries been scanned and directory closed.
 * @async
 * @param {TWalkContext} context
 * @returns {Promise<number>}
 */
Walker.prototype.onFinal = async function (context) {
  return DO_NOTHING
}

/**
 * Translate error if applicable.
 *
 * @param {Error} error   - with `context` property set.
 * @returns {number|Error|undefined}
 */
Walker.prototype.onError = function (error) {
  const override = exports.overrides[error.context.locus]

  return override && override[error.code]
}

/**
 * Reset counters for getTotals().
 * @returns {Walker}
 */
Walker.prototype.reset = function (data = nothing) {
  this.data = data === nothing ? {} : data
  this.failures = []
  this.halted = undefined
  this.visited.clear()
  this._nEntries = 0
  this._nextTick = 0
  return this
}

Walker.prototype.checkReturn_ = function (value, context, closure, locus) {
  if (value && typeof value !== 'number') {
    value = closure.end(null, value)
  } else if (value === DO_HALT) {
    value = closure.end(null, context.data) || this.halt_(context, locus)
  }
  return value
}

/**
 * Execute an asynchronous call and handle possible rejections.
 * @param {Object} closure
 * @param {string} name
 * @param {TWalkContext} context
 * @param args
 * @returns {Promise<*>}
 * @private
 */
Walker.prototype.execAsync_ = function (closure, name, context, ...args) {
  return closure[name].apply(this, args)
    .catch(error => {
      return this.onError_(error, name, context, closure, args)
    })
    .then(result => {
      if (!isNaN(closure.threadCount)) {
        closure.trace(name, result, closure, args)
        if (name !== 'opendir') {
          result = this.checkReturn_(result, context, closure, name)
        }
      }
      return result
    })
}

Walker.prototype.execSync_ = function (closure, name, context, ...args) {
  let result

  try {
    result = closure[name].apply(this, args)
    closure.trace(name, result, closure, args)
    if (name === 'onDir' && typeof result !== 'number') return result
  } catch (error) {
    result = this.onError_(error, name, context, closure, args)
  }
  return this.checkReturn_(result, context, closure, name)
}

/**
 * Handle error if possible, register, terminate/reject if necessary.
 * @private
 */
Walker.prototype.onError_ = function (error, name, context, closure, args) {
  error.context = { ...context, args, locus: name }

  let r = this.onError(error)

  if (typeof r === 'number') {
    if (r) {
      error.context.override = r
      this.failures.push(error)
    }
  } else {
    if (!(r instanceof Error)) r = error
    closure.end(r) || this.halt_(context, name)
    r = DO_ABORT
  }
  return r
}

Walker.prototype.halt_ = function (context, locus) {
  if (this.halted === undefined) {
    this.halted = { ...context, locus }
    delete this.halted.ruler
  }
  return DO_ABORT
}

/**
 *  Process directory tree synchronously width-first starting from `startPath`
 *  and invoke appropriate onXxx methods.
 *
 * @param {string} startPath
 * @param {TWalkOptions} opts
 * @param {function(*,*=)} callback
 * @private
 */
Walker.prototype.walk_ = function (startPath, opts, callback) {
  const data = { ...opts.data }
  const rootPath = resolve(startPath || '.')
  const tick = opts.tick || this.tick || noop
  const { interval } = this
  const closure = {
    end: function (error, value = null) {
      if (!isNaN(this.threadCount)) {
        this.threadCount = NaN
        callback(error, value)
      }
    },
    onDir: opts.onDir || this.onDir,
    onEntry: opts.onEntry || this.onEntry,
    onFinal: opts.onFinal || this.onFinal,
    opendir: exports.opendir,
    threadCount: 0,
    trace: opts.trace || this.trace || noop
  }
  /* eslint-disable-next-line */
  let doDirs

  const fifo = [{
    absPath: /\/$/.test(rootPath) ? rootPath : rootPath + sep,
    current: undefined,
    data,
    depth: 0,
    entries: undefined,
    ruler: opts.ruler || this.ruler
  }]

  const doDir = async (context) => {
    let res

    if (context.entries === undefined) {      //  We are in new directory.
      if (this.visited.has(context.absPath)) {
        return
      }
      const entries = []
      let dir, entry

      closure.threadCount += 1
      res = await this.execAsync_(closure, 'opendir', context, context.absPath)

      if (typeof res !== 'object') {
        if (res === DO_RETRY) {
          fifo.push(context)        //  Todo: extra checks here!
        }
      } else {
        dir = res
        res = this.execSync_(closure, 'onDir', context, context)
        if (!(res >= DO_ABORT)) {        //  onDir may return anything.
          this.visited.set(context.absPath, res)
          if (!(res >= DO_SKIP)) {
            for await (entry of dir) {
              entry = translateDirEntry(entry)
              res = this.execSync_(closure, 'onEntry', context, entry, context)
              this._nEntries += 1
              if (!(res < DO_ABORT)) break
              if (res < DO_SKIP) entries.push(entry)
            }
          }
        }
        try {
          await dir.close()
        } catch (error) {
          res = Math.max(res, this.onError_(error, 'closedir', context, closure, []))
        }
        this.checkReturn_(res, context, closure, 'closedir')
      }
      if (isNaN(closure.threadCount || this.halted)) {
        return
      }
      if (res < DO_ABORT) {
        context.entries = entries
        fifo.push(context)
      }
      closure.threadCount -= 1
    } else {  //  Phase II
      closure.threadCount += 1
      if (await this.execAsync_(closure, 'onFinal', context, context) < DO_SKIP) {
        const { entries } = context
        for (let i = 0, entry; (entry = entries[i]) !== undefined; i += 1) {
          if (entry.type !== T_DIR) continue
          const ctx = {
            ...context,
            absPath: context.absPath + entry.name + sep,
            depth: context.depth + 1,
            entries: undefined,
            ruler: context.ruler.clone(true)
          }
          fifo.push(ctx)
        }
      }
      closure.threadCount -= 1
    }
    // console.log(context.absPath, fifo.length, closure.threadCount)
    setTimeout(doDirs, 0)
  }

  doDirs = () => {
    const t = Date.now()

    if (t >= this._nextTick && (!isNaN(closure.threadCount))) {
      this._nextTick = t + interval
      tick.call(this, this._nEntries)
    }
    for (let context; (context = fifo.shift()) !== undefined;) {
      doDir(context)  //  Yes - the returned promise is ignored!
    }
    if (closure.threadCount === 0) {
      closure.end(null, data)
    }
  }

  this._nEntries += 1
  doDirs()
}

/**
 * Asynchronously walk a directory tree.
 * @param {string=} startPath     defaults to CWD
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

/**
 * Override rules for certain errors in certain locus.
 * @type {Object}
 */
exports.overrides = {
  closedir: {
    ERR_DIR_CLOSED: DO_NOTHING
  },
  opendir: {
    EACCES: DO_SKIP,
    EBADF: DO_ABORT,
    ELOOP: DO_SKIP,
    ENOTDIR: DO_SKIP,
    EPERM: DO_ABORT
    // ENOENT result in error because of bad input.
  }
}

//  Injection point for special cases e.g. testing.
exports.opendir = fs.promises.opendir
