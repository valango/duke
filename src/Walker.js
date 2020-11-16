'use strict'

const fs = require('fs')
const omit = require('lodash.omit')
const { resolve, sep } = require('path')
const { DO_ABORT, DO_NOTHING, DO_RETRY, DO_SKIP, DO_HALT, T_DIR, T_FILE, T_SYMLINK } =
        require('./constants')
const Ruler = require('./Ruler')
const { createEntry, translateEntry } = require('./translateDirEntry')

const { isNaN } = Number
const { max } = Math
const apply = Function.prototype.call.bind(Function.prototype.apply)
const methods = 'onDir onEntry onError onFinal openDir trace'.split(' ')
const noop = () => undefined
const nothing = Symbol('nothing')
const shadow = methods.concat('ruler')

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
  this._nDirs = 0
  this._nRepeated = 0
  this._nRetries = 0
  this._symlinks = Boolean(options.symlinks)

  this.reset(({ data: nothing, ...options }).data)  //  Process options.data
}

/* ************************ Handlers ************************ */

/**
 * Handler called immediately after directory has been opened.
 * @param {TWalkContext} context
 * @param {*=} currentValue
 * @returns {number}  numeric action code.
 */
Walker.prototype.onDir = function (context, currentValue = nothing) {
  return DO_NOTHING
}

/**
 * Handler called for every directory entry.
 * @param {TDirEntry} entry
 * @param {TWalkContext} context
 * @returns {number}
 */
Walker.prototype.onEntry = function (entry, context) {
  const action = context.ruler.check(entry.name, entry.type)
  entry.action = action
  entry.match = context.ruler.lastMatch
  return action
}

/**
 * Translate error if applicable.
 *
 * @param {Error} error   - with `context` property set.
 * @param {TWalkContext} context
 * @returns {number|Error|undefined}
 */
Walker.prototype.onError = function (error, context) {
  const override = exports.overrides[error.context.locus]

  return override && override[error.code]
}

/**
 * Handler called after all entries been scanned and directory closed.
 * @async
 * @param {TDirEntry[]}  entries
 * @param {TWalkContext} context
 * @param {number}       action   - the most relevant action code from `onEntry`.
 * @returns {Promise<number>}
 */
Walker.prototype.onFinal = function (entries, context, action) {
  if (this._symlinks) {
    const { absPath } = context, { realpath, stat } = exports

    return Promise.all(entries.map(({ action, name, type }, index) => {
      if (type !== T_SYMLINK || action >= DO_SKIP) return 0
      const path = absPath + name
      return stat(path).then(st => {
        if (this.halted) throw new Error('halted')
        return realpath(path).then(real => {
          if (st.isDirectory()) {
            entries[index] = createEntry(real, T_DIR, action)
          } else if (st.isFile()) entries[index] = createEntry(real, T_FILE, action)

          if (this.halted) throw new Error('halted')
          return 1
        })
      }).catch(error => {
        if (this.halted || !error.code) throw error
        if (error.code === 'ENOENT') {
          error.message = `WALKER: broken symlink '${path}'`
        }
        (error.context = omit(context, shadow)).locus = 'onFinal'
        return this.failures.push(error)
      })
    })).catch(error => {
      if (error.message !== 'halted') throw error
    }).then(() => DO_NOTHING)
  }
  return Promise.resolve(DO_NOTHING)
}

/* ************************ Other ************************ */

/**
 * Get total counts.
 * @returns {TWalkerStats}
 */
Walker.prototype.getStats = function () {
  return {
    dirs: this._nDirs,
    entries: this._nEntries,
    retries: this._nRetries,
    revoked: this._nRepeated
  }
}

/**
 * Reset counters for getStats().
 * @returns {Walker}
 */
Walker.prototype.reset = function (data = nothing) {
  this.data = data === nothing ? {} : data
  this.failures = []
  this.halted = undefined
  this.visited.clear()
  this._nDirs = this._nEntries = this._nextTick = this._nRepeated = this._nRetries = 0
  return this
}

/**
 * @param {string} name
 * @param {*} result
 * @param {TWalkContext} context
 * @param {Array<*>} args
 */
Walker.prototype.trace = (name, result, context, args) => {
}

Walker.prototype.checkReturn_ = function (value, context, closure, locus) {
  if (value && typeof value !== 'number') {
    value = closure.end(null, value)
  } else if (value === DO_HALT) {
    value = this.halt_(context, locus) && closure.end(null, context.data)
  }
  return this.halted ? closure.end(null, context.data) : value
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
  if (this.halted) return closure.end(null, context.data)

  return apply(context[name], this, args)
    .catch(error => {
      return this.onError_(error, name, context, closure, args)
    })
    .then(result => {
      if (name === 'openDir' && typeof result === 'object') return result
      if (!isNaN(closure.threadCount)) context.trace(name, result, context, args)

      return this.checkReturn_(result, context, closure, name)
    })
}

Walker.prototype.execSync_ = function (closure, name, context, ...args) {
  let result

  try {
    result = apply(context[name], this, args)
    context.trace(name, result, context, args)
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
  (error.context = omit(context, shadow)).locus = name

  let r = this.onError(error, context)

  if (typeof r === 'number') {
    if (r > 0) {
      error.context.override = r
      this.failures.push(error)
    }
  } else {
    if (!(r instanceof Error)) r = error
    this.halt_(context, name) && closure.end(r)
    r = DO_ABORT
  }
  return r
}

Walker.prototype.halt_ = function (context, locus) {
  if (this.halted === undefined) {
    (this.halted = omit(context, methods)).locus = locus
    delete this.halted.ruler
  }
  return DO_ABORT
}

Walker.prototype.halt = function (reason = 'User code') {
  this.halt_({}, reason)
  return this
}

/**
 * @type {function(*): any}
 */
Walker.prototype.tick = noop

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
  const data = opts.data || this.data || {}
  const rootPath = resolve(startPath || '.')
  const closure = {
    end: function (error, value = null) {
      if (!isNaN(this.threadCount)) {
        this.threadCount = NaN
        callback(error, value)
      }
      return DO_ABORT
    },
    threadCount: 0
  }

  /* eslint-disable-next-line */
  let doDirs

  const fifo = [{
    absPath: /\/$/.test(rootPath) ? rootPath : rootPath + sep,
    current: undefined,
    data,
    depth: 0,
    onDir: opts.onDir || this.onDir,
    onEntry: opts.onEntry || this.onEntry,
    onError: opts.onError || this.onError,
    onFinal: opts.onFinal || this.onFinal,
    openDir: exports.openDir,
    ruler: opts.ruler || this.ruler,
    trace: opts.trace || this.trace
  }]

  //  Return true when it was end.
  const checkEnd = () => {
    if (this.halted || (closure.threadCount === 0 && fifo.length === 0)) {
      closure.end(null, data)
      return true
    }
  }

  const { interval } = this, tick = opts.tick || this.tick

  if (!(interval >= 1)) this._nextTick = NaN

  // const chk = (n) => this.halted && console.log('H', n)

  const doDir = async (context) => {
    if (this.visited.has(context.absPath)) {
      this._nRepeated += 1
      return checkEnd()
    }
    const entries = []
    let action = DO_NOTHING, dir, res

    closure.threadCount += 1
    res = await this.execAsync_(closure, 'openDir', context, context.absPath)

    if (typeof res !== 'object') {
      if (res === DO_RETRY) {
        if (closure.threadCount === 1) {
          this.halt_(context, 'openDir.retry')
          return closure.end(new Error('Unable to retry'))
        }
        fifo.push(context)
      }
      return checkEnd(closure.threadCount -= 1)
    } else {
      this._nDirs += 1
      dir = res
      res = this.execSync_(closure, 'onDir', context, context)
      if (!(res >= DO_ABORT)) {        //  onDir may return anything.
        this.visited.set(context.absPath, res)
        if (!(res >= DO_SKIP)) {
          const iterator = dir.entries()
          let bad, entry
          while (this.halted === undefined) {
            try {
              const v = await iterator.next()
              if (v.done) break
              (entry = v.value) && (bad = undefined)
            } catch (error) {
              res = this.onError_(bad = error, 'iterateDir', context, closure, [])
            }
            if (res < DO_ABORT && bad === undefined) {
              entry = translateEntry(entry)
              res = this.execSync_(closure, 'onEntry', context, entry, context)
              this._nEntries += 1
              if (!(res < DO_ABORT)) break
              if (res < DO_SKIP) entries.push(entry) && (action = max(action, res))
              res = DO_NOTHING
            }
          }
        }
      }
      try {
        await dir.close()
      } catch (error) {
        res = max(res, this.onError_(error, 'closeDir', context, closure, []))
      }
      this.checkReturn_(res, context, closure, 'closeDir')
    }
    if (isNaN(closure.threadCount || this.halted)) {
      return
    }
    if (res < DO_ABORT) {
      if (await this.execAsync_(closure, 'onFinal', context, entries, context, action) < DO_SKIP) {
        for (let i = 0, entry; (entry = entries[i]) !== undefined; i += 1) {
          if (entry.type !== T_DIR || entry.action >= DO_SKIP) continue
          const ctx = {
            ...context,
            absPath: resolve(context.absPath, entry.name) + sep,
            depth: context.depth + 1,
            ruler: context.ruler.clone(entry.match)
          }
          fifo.push(ctx)
        }
      }
    }
    // console.log(context.absPath, fifo.length, closure.threadCount)
    if (checkEnd(closure.threadCount -= 1) !== true) setTimeout(doDirs, 0)
  }

  doDirs = () => {
    const t = Date.now()

    if (t >= this._nextTick && (!isNaN(closure.threadCount))) {
      this._nextTick = t + interval
      tick.call(this, this._nEntries)
    }
    for (let context; (context = fifo.shift()) !== undefined && this.halted === undefined;) {
      doDir(context)  //  Yes - the returned promise is ignored!
    }
    checkEnd()
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
  closeDir: {
    ERR_DIR_CLOSED: DO_NOTHING
  },
  iterateDir: {
    EBADF: DO_SKIP
  },
  openDir: {
    EACCES: DO_SKIP,
    EBADF: DO_ABORT,
    ELOOP: DO_SKIP,
    EMFILE: DO_RETRY,
    ENOTDIR: DO_SKIP,
    EPERM: DO_ABORT
    // ENOENT results from faulty file spec given, so it will not be overridden.
  }
}

//  Injection points for special cases e.g. testing.
exports.openDir = fs.promises.opendir
exports.realpath = fs.promises.realpath
exports.stat = fs.promises.stat
