'use strict'

//  Support for an easy fs mock - for testing, you know.
//  Todo: migrate tests to jest and strip the abominations like this.
let openDir

const mockFs = fs => (openDir = fs.promises.opendir)

mockFs(require('fs'))

const { join } = require('path')
const omit = require('lodash.omit')

const { DO_ABORT, DO_NOTHING, DO_RETRY, DO_SKIP, DO_HALT, T_DIR, T_SYMLINK } =
        require('./constants')
const Ruler = require('./Ruler')
const { fromDirEntry } = require('./util/dirEntry')
const translatePath = require('./helpers/pathTranslate')

const { isNaN } = Number
const { max } = Math
const apply = Function.prototype.call.bind(Function.prototype.apply)
const intimates = 'closure current data onDir onEntry onFinal openDir project'.split(' ')
const shadow = intimates.concat('ruler')
const nothing = Symbol('nothing')

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
    const opts = { interval: 100, ...options }

    /**
     * Array of error instances (with `context` property) from overridden exceptions.
     * @type {Array<Error>}
     */
    this.failures = undefined
    /**
     * Shared Terminal Condition, unless undefined.
     * NB: do not mutate it directly - this might be not possible in future!
     * @private
     */
    this._halted = undefined
    /**
     * @type {Ruler}
     */
    this.ruler = undefined
    /**
     * Minimum milliseconds between {@link Walker#tick} calls (default: 200).
     * @type {number}
     * @private
     */
    this._interval = undefined
    /**
     * For launching the `tick()` method.
     * @type {number}
     * @protected
     */
    this._nextTick = undefined
    /**
     * Descriptors of recognized filesystem subtrees.
     * @type {Map}
     * @private
     */
    this._visited = undefined
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
    this.avoid(opts.avoid)
  }

  /**
   * Avoid given paths.
   * @param {...*} args - absolute pathname or (nested) array of those.
   * @returns {Walker}
   */
  avoid (...args) {
    for (const path of args) {
      if (path instanceof Array) {
        this.avoid.apply(this, path)
      } else if (path) {
        const t = typeof path
        if (t !== 'string') throw new TypeError(`expected string, received '${t}'`)
        const p = translatePath(path, true)
        this._visited.set(p, false)
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
   * Retrieves the visitor entry for a path.
   * @param {string} path
   * @returns {Object|false}
   */
  getDataFor (path) {
    return this._visited.get(path)
  }

  /**
   * Gets override based on current error and context. Used by `checkError_()` method.
   * @param {Object} error
   * @param {TDirContext} context
   * @returns {number|undefined}
   */
  getOverride (error, context) {
    const overrides = Walker.overrides[context.locus]

    return overrides && overrides[error.code]
  }

  /**
   * Halt details, if any.
   * @returns {TDirContext|undefined}
   */
  get halted () {
    return this._halted
  }

  /**
   * Handler called before opening the directory.
   * Initialize directory data or check if it is specific in some way.
   *
   * @async
   * @param {TDirContext} context
   * @returns {Promise<number>}  action code.
   */
  async onDir (context) {
    return DO_NOTHING
  }

  /**
   * Handler called synchronously for every directory entry.
   * Not much computing should be done in overriding methods!
   *
   * @affects {entry.action}        - the inFinal() handler might use this.
   * @affects {entry.action}        - information about matching nodes in the rules tree.
   * @param {TDirEntry} entry
   * @param {TDirContext} context
   * @returns {number}              - the action code from ruler.check(entry)
   */
  onEntry (entry, context) {
    const action = context.ruler.check(entry.name, entry.type)
    entry.matched = context.ruler.lastMatch
    return (entry.action = action)
  }

  /**
   * Error situation handler.
   * Override this method for specific error handling.
   *
   * @param {Error} error - with `context.override` property already set by `checkError_()`.
   * @param {TDirContext} context
   * @returns {*}
   */
  onError (error, context) {
    return error.context.override
  }

  /**
   * Handler called after all entries been scanned and directory is closed.
   * @async
   * @param {TDirEntry[]}  entries
   * @param {TDirContext} context
   * @param {number}       recentAction - the most relevant action code from `onEntry`.
   * @returns {Promise<number>}     - DO_SKIP or higher prevents sub-dirs and links walking.
   */
  async onFinal (entries, context, recentAction) {
    return recentAction
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
      this.failures = []
      this._interval = _options.interval
      this._nextTick = this._interval >= 1 ? 0 : NaN
      this.ruler = _options.rules instanceof Ruler ? _options.rules : newRuler(_options.rules)
      this._visited = new Map()
      this._tTotal = this._nDirs = this._nEntries = this._nErrors =
        this._nextTick = this._nRevoked = this._nRetries = 0
    }
    this._halted = undefined
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
   * @param {TDirContext} context
   * @param {Array<*>} args
   */
  trace (name, result, context, args) {
  }

  /**
   * Asynchronously walk a directory tree.
   * @param {string} [startPath]     - defaults to process.cwd()
   * @param {TWalkOptions}  [options]
   * @returns {Promise<*>}  resolves to walk context `data` member.
   */
  /* walk (startPath, options = undefined) {
    if (this._nWalks === 0) this._tStart = process.hrtime()
    this._nWalks += 1

    return this.walk_(startPath, options || {})
  } */

  /* ************************ Protected ************************ */

  /**
   * Handle error if possible, register, terminate/reject if necessary.
   * @param {*}             value   - will be just returned, if not an Error instance.
   * @param {TDirContext}  context
   * @param {string}        [locus]
   * @returns {*}                   - numeric action code or `value`.
   * @protected
   */
  checkError_ (value, context, locus = undefined) {
    if (!(value instanceof Error)) return value

    this._nErrors += 1

    if (locus !== undefined) {
      context.locus = locus
    }
    (value.context = omit(context, shadow)).override = this.getOverride(value, context)

    let handledValue = this.onError(value, context)

    if (typeof handledValue === 'number') {
      if (handledValue > 0) {                   //  DO_NOTHING override ignores error
        value.context.override = handledValue
        this.failures.push(value)
      }
    } else {
      handledValue = value
    }
    return handledValue
  }

  /**
   * Process the return value from the executed function.
   * @param value
   * @param {TDirContext} context
   * @param {string} locus
   * @param args
   * @returns {*}
   * @private
   */
  checkResult_ (value, context, locus, args) {
    if (value instanceof Error) {
      value = this.checkError_(value, context, locus)
    }
    this.trace(locus, value, context, args)

    if (value === DO_RETRY) {
      if (context.closure.callsPending === 1) {
        this.halt_(context, locus + '.RETRY')
        return new Error('Unable to retry')
      }
      context.closure.push(context)
      value = DO_NOTHING
    } else {
      context.done = locus
    }
    return value
  }

  /**
   * Execute an asynchronous function and handle possible rejections.
   * @param {string} name - function name
   * @param {TDirContext} context
   * @param args
   * @returns {Promise<*>}
   * @protected
   */
  execAsync_ (name, context, ...args) {
    if (this._halted || !context.data) {
      context.data = undefined
      return Promise.resolve(DO_ABORT)
    }

    const value = apply(context[name], this, args)

    return (value instanceof Promise ? value : Promise.resolve(value))
      .catch(error => error)
      .then(result => this.checkResult_(result, context, name, args))
  }

  /**
   * Execute a synchronous function and handle possible rejections.
   * @param {string} name - function name
   * @param {TDirContext} context
   * @param {...*} args
   * @returns {number}
   * @protected
   */
  execSync_ (name, context, ...args) {
    if (this._halted || !context.data) return (context.data = undefined) || DO_ABORT

    let result

    try {
      if ((result = apply(context[name], this, args)) instanceof Promise) {
        result = new Error('Unexpected promise returned')
      }
    } catch (error) {
      result = error
    }
    return this.checkResult_(result, context, name, args)
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
   * @param {TDirContext}  context
   * @param {string}        locus
   * @returns {number}              - always DO_ABORT.
   * @protected
   */
  halt_ (context, locus = undefined) {
    if (!this._halted) {
      this._halted = omit(context, intimates)
      if (locus) this._halted.locus = locus
    }
    return DO_ABORT
  }

  /**
   *  Process directory tree synchronously width-first starting from `startPath`
   *  and invoke appropriate handler methods.
   *
   * @param {string} startPath
   * @param {TWalkOptions} options
   * @protected
   */
  async walk (startPath, options) {
    const opts = options || {}
    const data = opts.data || [], rootPath = translatePath(startPath, true)

    let result = nothing, fifo = [Object.seal({
      closure: undefined,
      current: undefined,
      data,                   //  NB: undefined value here means immediate return.
      depth: 0,
      dirPath: rootPath,
      done: undefined,        //  To enable the _retry_ functionality.
      locus: undefined,
      onDir: opts.onDir || this.onDir,
      onEntry: opts.onEntry || this.onEntry,
      onFinal: opts.onFinal || this.onFinal,
      project: undefined,
      rootPath,
      ruler: opts.ruler || this.ruler
    })]

    //  A namespace available to all sub-walks of this walk.
    const closure = {
      callsPending: 0,         //  Number of async call currently active.
      push: ctx => fifo.push(ctx)
    }

    const { _interval } = this, tick = this.tick

    /**
     * Walks the current directory.
     * @param {TDirContext} context
     * @returns {Promise<*>}  action code or immediate value from the last handler.
     */
    const doDir = async (context) => {
      const entries = []
      let dir, res

      context.closure = closure

      /**
       * Checks for LTC/STC and return `nothing` when none is met;
       * if returnValue is supplied, ends with that.
       * @param {*} [returnValue = 0]
       * @returns {*}
       */
      const checkEnd = (returnValue = 0) => {
        if (result !== nothing) return result
        if (this._halted) return this._halted

        if (typeof returnValue !== 'number') {
          (context.data = undefined) || (result = returnValue)
        } else if (returnValue === DO_HALT) {
          this.halt_(context)
        }
        return returnValue
      }

      const t = Date.now()

      if (t >= this._nextTick && (!isNaN(closure.callsPending))) {
        this._nextTick = t + _interval
        tick.call(this, this._nEntries)
      }

      if (context.done === undefined) {
        if (this._visited.has(context.dirPath)) {
          this._nRevoked += 1
          return DO_SKIP
        }
        this._visited.set(context.dirPath, context.current = Object.create(null))
        closure.callsPending += 1
        res = await this.execAsync_('onDir', context, context)
        closure.callsPending -= 1
        if (!(res < DO_ABORT)) return checkEnd(res)
        this._nDirs += 1
      }
      if (context.done === 'onDir') {
        closure.callsPending += 1
        dir = await this.execAsync_('openDir', { ...context, openDir }, context.dirPath)
        closure.callsPending -= 1
        if (dir instanceof Error || typeof dir !== 'object') return checkEnd(dir)

        const iterator = dir.entries()
        let entryFailed, entry

        closure.callsPending += 1
        while (!this._halted) {
          res = DO_NOTHING
          try {
            const v = await iterator.next()
            if (v.done) break
            (entry = v.value) && (entryFailed = undefined)
          } catch (error) {
            res = this.checkError_(entryFailed = error, context, 'iterateDir')
          }
          if (res < DO_ABORT && entryFailed === undefined) {
            this._nEntries += 1
            entry = fromDirEntry(entry)
            res = this.execSync_('onEntry', context, entry, context)
            if (!(res < DO_ABORT)) break

            if (res < DO_SKIP) {
              if (entry.type === T_DIR || res > DO_NOTHING ||
                (entry.type === T_SYMLINK && this._useSymLinks)) {
                entries.push(entry)
              }
            }
          }
        }

        try {   //  May be closed already by async iterator...
          await dir.close()
        } catch (error) {
          res = max(res, this.checkError_(error, context, 'closeDir'))
        }
        context.done = 'closeDir'
        closure.callsPending -= 1
      }

      if (context.done === 'closeDir') {
        if (res < DO_ABORT) {
          for (let i = 0, entry; (entry = entries[i]) !== undefined; i += 1) {
            if (entry.type !== T_DIR || entry.action >= DO_SKIP) continue
            const ctx = {
              ...context,
              closure: undefined,
              current: undefined,
              data,
              depth: context.depth + 1,
              done: undefined,
              dirPath: join(context.dirPath, entry.name),
              ruler: context.ruler.clone(entry.matched)
            }
            fifo.push(Object.seal(ctx))
          }
        }
        closure.callsPending += 1
        res = await this.execAsync_('onFinal', context, entries, context, res)
        closure.callsPending -= 1
      }

      return checkEnd(res)
    }
    //  =================  Start walking =================
    if (this._nWalks === 0) this._tStart = process.hrtime()

    this._nWalks += 1
    this._nEntries += 1

    while (fifo.length) {
      const dirs = fifo

      fifo = []
      await Promise.all(dirs.map(ctx => doDir(ctx)))
    }
    this.finalize_()

    return result instanceof Error ? Promise.reject(result) : (result === nothing ? data : result)
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
    EISDIR: DO_ABORT,     //  It happens, when package.json is a directory.
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
    // ENOENT results from faulty file spec given, so it should not be overridden.
  }
}

/**
 * For masking out parts of `context` when registering an error.
 * @type {string[]}
 */
Walker.shadow = shadow

Walker.mockFs = mockFs
