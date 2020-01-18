/**
 * @module Sincere
 */
'use strict'
const assert = require('assert').strict
const { format } = require('util')

const notProduction = process.env.NODE_ENV !== 'production'
const noop = () => undefined

let hook = noop, seed = -1

/**
 * A base class for better diagnostics and easier debugging.
 *
 * NB: This interface is meant for diagnostics only - do NOT use it for computations!
 */
class Sincere {
  constructor () {
    this._id = ++seed
  }

  get sincereClass () {
    const r = /^(class|function)\s+(\w+)/.exec(this.constructor.toString())
    return r[2]
  }

  static sincereReset () {
    if (notProduction) seed = -1
  }

  static sincereHook (callback) {
    const old = hook
    if (notProduction && callback !== undefined) hook = callback || noop
    return old
  }

  get sincereId () {
    return this._id
  }

  get sincereName () {
    return this.sincereClass + '#' + this.sincereId
  }

  assert (condition, locus, ...args) {
    if (condition) return condition                //  Chain-able.
    if (notProduction) {
      hook.call(this, locus, args)
    }
    assert(condition, this.sincereMessage(locus, args))
  }

  sincereMessage (locus, other) {
    return this.sincereClass + '.' + locus + ': ' + format.apply(undefined,
      other)
  }
}

module.exports = Sincere
