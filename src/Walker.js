'use strict'

const expectedOnOpendir = ['ELOOP', 'ENOENT', 'ENOTDIR', 'EPERM']

const { opendirSync } = require('fs')
const { resolve, sep } = require('path')
const Sincere = require('sincere')
const definitions = require('./definitions')
const Ruler = require('./Ruler')

/* eslint-disable */
const {
        CONTINUE, DISCLAIM, DO_ABORT, DO_SKIP, DO_TERMINATE,
        T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK,
        actionName
      } = definitions
/* eslint-enable */

const types = {
  isBlockDevice: T_BLOCK,
  isCharacterDevice: T_CHAR,
  isDirectory: T_DIR,
  isFIFO: T_FIFO,
  isFile: T_FILE,
  isSocket: T_SOCKET,
  isSymbolicLink: T_SYMLINK
}

const getType = (entry) => {
  for (const test of Object.keys(types)) {
    if (entry[test]()) return types[test]
  }
}

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
    let o = { talk: () => undefined, ...options }
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
   *
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

    if (ctx.current) {
      this.talk('BEGIN:', ''.padStart(ctx.depth) + ctx.dir, ctx.absDir)
      ctx.master = undefined
      this.trees.push(ctx.current)
    } else {
      ctx.current = ctx.master
    }
    return res
  }

  //  NB: here we have ctx.action too.
  onEnd (ctx) {
    if (ctx.current) {
      if (!ctx.master) {
        this.talk('END', ''.padStart(ctx.depth) + ctx.dir)
        return 0
      }
      return DO_SKIP
    }
  }

  onEntry (ctx) {
    count += 1
    const { name, ruler, type } = ctx

    const matches = ruler.match(name)
    const action = matches.length ? matches[0][0] : DISCLAIM

    switch (action) {
      case CONTINUE:
      case DISCLAIM:
        //  Forward our rule parsing context to subdirectory.
        if (type === T_DIR) {
          return { ruler: ruler.clone(matches) }
        }
        break
      case DO_ABORT:
        this.talk('DO_ABORT', ctx.dir + '/' + ctx.name)
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

      if ((r = onError.call(this, error, argument, expected)) === undefined) {
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

  talk (...args) {
    this.options.talk.apply(this, args)
    return this
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
      const context = paths.shift(), length = paths.length
      context.absDir = context.dir ? root + sep + context.dir : root

      if (typeof (directory = this.safely_(closure, opendirSync, context.absDir,
        expectedOnOpendir)) !== 'object') {
        continue
      }
      context.absDir += sep   //  Handlers get `absDir` `sep` terminated!

      action = this.safely_(closure, onBegin, context)

      if (!(action >= DO_SKIP)) {
        if ((t = Date.now()) > this.nextTick) {
          this.nextTick = Infinity
          this.tick(count)
          this.nextTick = t + this.interval
        }

        while ((entry = directory.readSync())) {
          context.name = entry.name
          context.type = getType(entry)

          action = this.safely_(closure, onEntry, context)

          if (action === DO_ABORT || action === DO_TERMINATE) {
            paths.splice(length, length)
            break
          } else if (context.type === T_DIR && action !== DO_SKIP) {
            paths.push({
              ...context,
              current: undefined,
              depth: context.depth + 1,
              dir: context.dir + sep + context.name,
              locals: typeof action === 'object' ? action : {},
              master: undefined
            })
          }
        }         //  end of while (entry...)
      } else {  //  end of if (action...)
        this.talk('onBegin -> ', actionName(action))
      }
      directory.closeSync()

      context.action = action   //  Special to this handler only.
      action = this.safely_(closure, onEnd, context)

      if (action >= DO_ABORT) {
        break
      }
    }       //  end while (paths...)
    return closure
  }
}

module.exports = Walker
