'use strict'
const assert = require('assert').strict
const { format, inspect } = require('util')

const notProduction = process.env.NODE_ENV !== 'production'
const noop = () => undefined

let hook = noop, seed = -1

/**
 * A base class for better diagnostics and easier debugging.
 *
 * Only `assert()` and `className` interface should be used in non-diagnostic code.
 *
 * @example
 * const Sincere = require('Sincere')
 *
 * Sincere.sincereHook(() => {
 *   return 0     //  Set debugger breakpoint here.
 * }
 *
 * class MyClass extends Sincere {
 *   ...
 * }
 */
class Sincere {
  constructor () {
    this._className = /^(class|function)\s+(\w+)/
      .exec(this.constructor.toString())[2]
    this._id = this._className + '#' + ++seed
  }

  /**
   * Wrapper around the native `assert` package.
   *
   * It composes informative error message for failed assertion and
   * invokes assertion hook function before assertion error is thrown.
   *
   * @param {*} condition
   * @param {string} locus - usually method name.
   * @param {...*} args    - the first may be format string.
   * @returns {*} condition value if it was truthy.
   */
  assert (condition, locus, ...args) {
    if (condition) return condition                //  Chain-able.
    if (notProduction) {
      hook.call(this, locus, args)
    }
    assert(condition, this.sincereMessage(locus, args))
  }

  /**
   * Actual class name of the instance.
   * @type {string}
   */
  get className () {
    return this._className
  }

  /**
   * Sets a callback hook for assert() method.
   * @param {function()|false|undefined} callback has no effect in production.
   * @returns {function()}  previous callback hook.
   */
  static sincereHook (callback = undefined) {
    const old = hook
    if (notProduction && callback !== undefined) hook = callback || noop
    return old
  }

  /**
   * Reset unique id generation seed. Has no effect in production mode.
   */
  static sincereReset () {
    if (notProduction) seed = -1
  }

  /**
   * Unique instance id for diagnostic purposes.
   * @type {string}
   */
  get sincereId () {
    return this._id
  }

  /**
   * Compose a diagnostic message.
   *
   * @param {string} locus
   * @param {Array<*>} args
   * @returns {string}
   */
  sincereMessage (locus, args) {
    const rest = args.map((a) => (a && typeof a === 'object') ? inspect(a) : a)
    return this.sincereId + '.' + locus + ': ' +
      format.apply(undefined, rest)
  }
}

module.exports = Sincere
