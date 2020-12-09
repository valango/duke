'use strict'

//  Support for an easy fs mock - for testing, you know.
let openDir

const mockFs = fs => (openDir = fs.promises.opendir)

mockFs(require('fs'))

const { resolve, sep } = require('path')
const omit = require('lodash.omit')

const { DO_ABORT, DO_NOTHING, DO_RETRY, DO_SKIP, DO_HALT, T_DIR, T_SYMLINK } =
        require('./constants')
const Ruler = require('./Ruler')
const { fromDirEntry } = require('./util/dirEntry')

const { isNaN } = Number
const { max } = Math
const apply = Function.prototype.call.bind(Function.prototype.apply)
const empty = () => Object.create(null)
const intimates = 'closure data onDir onEntry onError onFinal openDir trace'.split(' ')
const nothing = Symbol('nothing')
const shadow = intimates.concat('ruler')
const termBySep = new RegExp('\\' + sep + '$')

const usecsFrom = t0 => {
  const t1 = process.hrtime(t0)
  return (t1[0] * 1e9 + t1[1]) / 1000
}

/**
 * A static helper method so you don't have to import Ruler class explicitly.
 * @param {...*} args
 * @returns {Ruler}
 */
const newRuler = (...args) => new Ruler(...args)

/**
 * File system walk machinery.
 */
class Walker {
  /**
   * @param {Object} options
   * @constructor
   */
  constructor (options = {}) {
    const opts = { data: nothing, interval: 200, ...options }

    /**
     * Data instance to be shared between all walks.
     * @type {Object}
     */
    this.data = undefined
    /**
     * Array of error instances (with `context` property) from overridden exceptions.
     * @type {Array<Error>}
     */
    this.failures = undefined
    /**
     * Shared Terminal Condition, unless undefined.
     * NB: do not mutate it directly - this might be not possible in future!
     * @type {TWalkContext}
     */
    this.halted = undefined
    /**
     * Minimum milliseconds between {@link Walker#tick} calls (default: 200).
     * @type {number}
     */
    this.interval = undefined
    /**
     * @type {Ruler}
     */
    this.ruler = undefined
    /**
     * Descriptors of recognized filesystem subtrees.
     * @type {Map}
     * @protected
     */
    this._visited = undefined
    /**
     * For launching the `tick()` method.
     * @type {number}
     * @protected
     */
    this._nextTick = undefined
    /**
     * @type {number}
     * @protected
     */
    this._nEntries = undefined
    this._nErrors = undefined
    this._nDirs = undefined
    this._nRevoked = undefined
    this._nRetries = undefined
    this._nWalks = 0
    this._options = opts
    this._useSymLinks = Boolean(opts.symlinks)
    this._tStart = undefined
    this._tTotal = undefined

    this.reset(true)
  }

  /**
   * Avoid given paths.
   * @param {...*} args - absolute pathname or (nested) array of those.
   * @returns {Walker}
   */
  avoid (...args) {
    for (const path of args) {
      if (Array.isArray(path)) {
        this.avoid.apply(this, path)
      } else if (path) {
        const t = typeof path, { _visited } = this
        if (t !== 'string') throw new TypeError(`expected string, received '${t}'`)
        let p = resolve(path)
        if (!termBySep.test(path)) p += sep
        if (!_visited.has(p)) _visited.set(p, false)
      }
    }
    return this
  }

  /**
   * Time elapsed from start of the walks batch in progress, or
   * the duration of the most recent walk batch.
   * @type {number}
   */
  get duration () {
    return this._nWalks > 0 ? usecsFrom(this._tStart) : this._tTotal
  }

  /**
   * Gets override based on current error and context. Used by `onError_()` method.
   * @param {Error} error
   * @param {TWalkContext} context
   * @returns {number|undefined}
   */
  getOverride (error, context) {
    const overrides = Walker.overrides[context.locus]

    return overrides && overrides[error.code]
  }

  /**
   * Set the Shared Terminal Condition.
   * @param {TWalkContext} context
   * @param {*=} givenDetails
   * @returns {Walker}
   */
  halt (context = undefined, givenDetails = undefined) {
    const details = givenDetails || 'halted by user code'
    this.halt_({ ...context, details })
    return this
  }

  /**
   * Handler called before opening the directory.
   * Initialize directory data or check if it is specific in some way.
   *
   * @async
   * @param {TWalkContext} context
   * @returns {number}  action code.
   */
  async onDir (context) {
    return DO_NOTHING
  }

  /**
   * Handler called synchronously for every directory entry.
   * Not much computing should be done here.
   *
   * @param {TDirEntry} entry
   * @param {TWalkContext} context
   * @returns {number}
   */
  onEntry (entry, context) {
    const action = context.ruler.check(entry.name, entry.type)
    entry.match = context.ruler.lastMatch
    return action
  }

  /**
   * Error situation handler.
   * Override this method for specific error handling.
   *
   * @param {Error} error - with `context.override` property already set by `onError_()`.
   * @param {TWalkContext} context
   * @returns {*}
   */
  onError (error, context) {
    return error.context.override
  }

  /**
   * Handler called after all entries been scanned and directory is closed.
   * @async
   * @param {TDirEntry[]}  entries
   * @param {TWalkContext} context
   * @param {number}       action   - the most relevant action code from `onEntry`.
   * @returns {Promise<number>}     - DO_SKIP or higher prevents sub-dirs and links walking.
   */
  async onFinal (entries, context, action) {
    return action
  }

  /**
   * Reset possible halted condition.
   * @param {boolean=} hard - reset the instance to initial state.
   * @returns {Walker}
   */
  reset (hard = false) {
    if (this._nWalks !== 0) {
      throw new Error(`reset while ${this._nWalks} walks in progress`)
    }
    if (hard) {
      const { _options } = this
      this.data = _options.data === nothing ? empty() : { ..._options.data }
      this.failures = []
      this.interval = _options.interval
      this.ruler = _options.rules instanceof Ruler
        ? _options.rules : newRuler(_options.rules)
      this._visited = new Map()
      this._tTotal = this._nDirs = this._nEntries = this._nErrors =
        this._nextTick = this._nRevoked = this._nRetries = 0
    }
    this.halted = undefined
    return this
  }

  /**
   * Different counters.
   * @type {TWalkerStats}
   */
  get stats () {
    return {
      dirs: this._nDirs,
      entries: this._nEntries,
      errors: this._nErrors,
      retries: this._nRetries,
      revoked: this._nRevoked,
      walks: this._nWalks
    }
  }

  /**
   * For progress indicators.
   * @param {number} countOfEntriesProcessed
   * @returns {*}
   */
  tick (countOfEntriesProcessed) {
  }

  /**
   * For debugging only - do not try anything clever here!
   * @param {string} name
   * @param {*} result
   * @param {TWalkContext} context
   * @param {Array<*>} args
   */
  trace (name, result, context, args) {
  }

  /**
   * Expose only safe members of `_visited` collection.
   * @type {Object}
   */
  get visited () {
    const { _visited } = this

    return { size: _visited.size }
  }

  /**
   * Asynchronously walk a directory tree.
   * @param {string=} startPath     - defaults to process.cwd()
   * @param {TWalkOptions=} options
   * @returns {Promise<*>}  resolves to `data` member of `options` or `this`.
   */
  walk (startPath, options = {}) {
    if (this._nWalks === 0) this._tStart = process.hrtime()
    this._nWalks += 1

    return new Promise((resolve, reject) =>
      this.walk_(startPath, options, (error, data) =>
        this.finalize_() && (error ? reject(error) : resolve(data)))
    )
  }

  /**
   * Active walks count.
   * @type {number}
   */
  get walks () {
    return this._nWalks
  }

  /* ************************ Protected ************************ */

  /**
   * Check for special action codes returned, terminate the walk if necessary.
   * @param {*}             value
   * @param {TWalkContext}  context
   * @param {string}        locus
   * @returns {number}              - action code.
   * @protected
   */
  checkReturn_ (value, context, locus) {
    const { closure } = context

    if (value && typeof value !== 'number') {
      value = closure.end(null, value)
    } else if (value === DO_HALT) {
      value = this.halt_(context, locus) && closure.end(null, context.data)
    }
    return this.halted ? closure.end(null, context.data) : value
  }

  /**
   * Execute an asynchronous function and handle possible rejections.
   * @param {string} functionName
   * @param {TWalkContext} context
   * @param args
   * @returns {Promise<*>}
   * @protected
   */
  execAsync_ (functionName, context, ...args) {
    const { closure } = context

    if (this.halted) return closure.end(null, context.data)
    try {
      return apply(context[functionName], this, args)
        .catch(error => {
          return this.onError_(error, context, functionName)
        })
        .then(result => {
          if (isNaN(closure.threadCount)) return closure.end(null, context.data)

          context.trace(functionName, result, context, args)
          if (result === DO_RETRY) {
            if (closure.threadCount === 1) {
              this.halt_(context, functionName + '.RETRY')
              return closure.end(new Error('Unable to retry'))
            }
            closure.fifo.push(context)
            result = DO_NOTHING
          } else {
            context.done = functionName
            if (!(typeof result === 'object' && functionName === 'openDir')) {
              result = this.checkReturn_(result, context, functionName)
            }
          }
          return result
        })
    } catch (e) {
      /* eslint-disable-next-line */
      console.log('execAsync_', functionName, context.absPath)
      throw e
    }
  }

  /**
   * Execute a synchronous function and handle possible rejections.
   * @param {string} functionName
   * @param {TWalkContext} context
   * @param {...*} args
   * @returns {number}
   * @protected
   */
  execSync_ (functionName, context, ...args) {
    let result

    try {
      result = apply(context[functionName], this, args)
      context.trace(functionName, result, context, args)
    } catch (error) {
      result = this.onError_(error, context, functionName)
    }
    return this.checkReturn_(result, context, functionName)
  }

  /**
   * Sets the Local Terminal Condition. Used internally by `walk()` instance method.
   * @returns {boolean} always true (for call chaining).
   * @private
   */
  finalize_ () {
    if (!(this._nWalks > 0)) throw new Error('Walk counter meltdown')
    if ((this._nWalks -= 1) === 0) {
      this._tTotal = usecsFrom(this._tStart)
      this._tStart = undefined
    }
    return true
  }

  /**
   * Sets the Shared Terminal Condition. Used internally.
   * @param {TWalkContext}  context
   * @param {string}        locus
   * @returns {number}              - always DO_ABORT.
   * @private
   */
  halt_ (context, locus) {
    if (this.halted === undefined) {
      (this.halted = omit(context, intimates)).locus = locus
      delete this.halted.ruler
    }
    return DO_ABORT
  }

  /**
   * Handle error if possible, register, terminate/reject if necessary.
   * @param {Error}         error
   * @param {TWalkContext}  context
   * @param {string}        [locus]
   * @returns {number}              - action code
   * @protected
   */
  onError_ (error, context, locus = undefined) {
    this._nErrors += 1

    if (locus !== undefined) {
      context.locus = locus
    }
    (error.context = omit(context, shadow)).override = this.getOverride(error, context)

    let r = this.onError(error, context)

    if (typeof r === 'number') {
      if (r > 0) {
        error.context.override = r
        this.failures.push(error)
      }
    } else {
      if (!(r instanceof Error)) r = error
      this.halt_(context, locus) && context.closure.end(r)
      r = DO_ABORT
    }
    return r
  }

  /**
   *  Process directory tree synchronously width-first starting from `startPath`
   *  and invoke appropriate handler methods.
   *
   * @param {string} startPath
   * @param {TWalkOptions} opts
   * @param {function(*,*=)} callback
   * @protected
   */
  walk_ (startPath, opts, callback) {
    const data = opts.data || this.data || empty()
    const rootPath = resolve(startPath || '.')
    /* eslint-disable-next-line */
    let doDirs

    const fifo = [{
      absPath: termBySep.test(rootPath) ? rootPath : rootPath + sep,
      closure: undefined,
      current: undefined,
      data,
      depth: 0,
      done: undefined,
      onDir: opts.onDir || this.onDir,
      onEntry: opts.onEntry || this.onEntry,
      onError: opts.onError || this.onError,
      onFinal: opts.onFinal || this.onFinal,
      openDir,
      ruler: opts.ruler || this.ruler,
      trace: opts.trace || this.trace,
      upperAction: DO_NOTHING
    }]

    const closure = {
      //  Settle the promise and set the Local Terminal Condition.
      end: function (error, value = null) {
        if (!isNaN(this.threadCount)) {
          this.threadCount = NaN
          callback(error, value)
        }
        return DO_ABORT
      },
      fifo,
      threadCount: 0
    }

    //  Check if the Shared/Local Terminal Condition is set.
    const checkEnd = () => {
      if (this.halted || !((closure.threadCount + fifo.length) > 0)) {
        closure.end(null, data)
        return true
      }
    }

    const { interval } = this, tick = this.tick

    if (!(interval >= 1)) this._nextTick = NaN

    //  Most of the magic happens in here. Return value is not used.
    const doDir = async (context) => {
      const entries = []
      let action = DO_NOTHING, dir, res

      context.closure = closure

      if (context.done === undefined) {
        if (this._visited.has(context.absPath)) {
          return checkEnd(this._nRevoked += 1)
        }
        closure.threadCount += 1
        res = await this.execAsync_('onDir', context, context)
        closure.threadCount -= 1
        if (res >= DO_SKIP) {
          return checkEnd()
        }
        this._visited.set(context.absPath, empty())
        this._nDirs += 1
      }
      if (context.done === 'onDir') {
        closure.threadCount += 1
        res = await this.execAsync_('openDir', context, context.absPath)
        closure.threadCount -= 1
        if (typeof res !== 'object') return checkEnd()
        dir = res

        const iterator = dir.entries()
        let bad, entry

        closure.threadCount += 1
        while (this.halted === undefined) {
          res = DO_NOTHING
          try {
            const v = await iterator.next()
            if (v.done) break
            (entry = v.value) && (bad = undefined)
          } catch (error) {
            res = this.onError_(bad = error, context, 'iterateDir')
          }
          if (res < DO_ABORT && bad === undefined) {
            entry = fromDirEntry(entry)
            res = this.execSync_('onEntry', context, entry, context)
            this._nEntries += 1

            if ((entry.action = res) === DO_SKIP) continue
            if ((action = max(action, res)) < DO_ABORT) {
              if (entry.type === T_DIR) {
                entries.push(entry)
              } else if (entry.type === T_SYMLINK && this._useSymLinks) {
                entries.push(entry)
              }
            }
          }
        }

        try {   //  May be closed already by async iterator...
          await dir.close()
        } catch (error) {
          res = max(res, this.onError_(error, context, 'closeDir'))
        }
        if (this.checkReturn_(res, context, 'closeDir') < DO_ABORT) {
          context.done = 'closeDir'
        }
        closure.threadCount -= 1
      }

      if (context.done === 'closeDir') {
        closure.threadCount += 1
        res = await this.execAsync_('onFinal', context, entries, context, action)
        closure.threadCount -= 1
        if (res < DO_SKIP) {
          for (let i = 0, entry; (entry = entries[i]) !== undefined; i += 1) {
            if (entry.type !== T_DIR || entry.action >= DO_SKIP) continue
            const ctx = {
              ...context,
              absPath: resolve(context.absPath, entry.name) + sep,
              closure: undefined,
              done: undefined,
              depth: context.depth + 1,
              ruler: context.ruler.clone(entry.match),
              upperAction: entry.action
            }
            fifo.push(ctx)
          }
        }
      }

      if (checkEnd()) {
        return
      }
      setTimeout(doDirs, 0)
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
}

Walker.newRuler = newRuler

module.exports = Walker

/**
 * Override rules for certain errors in certain locus.
 * @type {Object<{closeDir,iterateDir,onDir,openDir}>}
 */
Walker.overrides = {
  closeDir: {
    ERR_DIR_CLOSED: DO_NOTHING
  },
  iterateDir: {
    EBADF: DO_SKIP
  },
  onDir: {
    EACCES: DO_NOTHING,
    EMFILE: DO_RETRY,
    ENOENT: DO_NOTHING
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

/**
 * For masking out parts of `context` when registering an error.
 * @type {string[]}
 */
Walker.shadow = shadow

Walker.mockFs = mockFs
