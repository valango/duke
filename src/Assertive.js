/**
 * @module Assertive
 */
'use strict'
const assert = require('assert').strict
const { format } = require('util')

let seed = -1

/**
 * A base class for better diagnostics and easier debugging.
 *
 * NB: This interface is meant for diagnostics only - do NOT use it for computations!
 */
class Assertive {
  constructor () {
    this._id = ++seed
  }

  /** @type {string} */
  get className () {
    const r = /^(class|function)\s+(\w+)/.exec(this.constructor.toString())
    return r[2]
  }

  /** @type {*} */
  get id () {
    return this._id
  }

  /** @type {string} */
  get name () {
    return this.className + '#' + this.id
  }

  /**
   * Wrapper around native assert.
   * @param {*} condition
   * @param {string} locus
   * @param {...*} args
   * @returns {*}
   * @throws {AssertionError}
   */
  assert (condition, locus, ...args) {
    if (condition) return condition                //  Chain-able.
    assert(condition, this.diagnosticMessage(locus, args))
  }

  /**
   * Compose diagnostic message.
   *
   * @param {string} locus
   * @param {*[]} other
   * @returns {string}
   */
  diagnosticMessage (locus, other) {
    return this.className + '.' + locus + ': ' + format.apply(undefined, other)
  }
}

exports = module.exports = Assertive

/**
 * May become handy when testing.
 */
exports.reset = (value = -1) => {
  seed = value
  return exports
}
