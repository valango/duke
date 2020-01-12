/**
 * @module RuleTree
 */
'use strict'

const ME = 'RuleTree'

const assert = require('assert').strict
const parse = require('./parse')

const NIL = -1
const TERM = 1      //  Terminal node.
const TERM_EX = 2   //  Terminal node of exclusion path.

const { GLOB } = parse

/**
 * @typedef TNode [parent, rule, flags]
 */

const score_ = ({ rule, flag }) => {
  let l, v = 0
  if (rule) {
    v = (l = rule.length) * 100
    if (rule[0] !== '^') v -= 20
    if (rule[l - 1] !== '$') v -= 20
    if (rule.indexOf('*') >= 0) v -= 10
    if (rule.indexOf('+') >= 0) v -= 8
    if (rule.indexOf('.') >= 0) v -= 5
  }
  return flag * 10000 + v
}

class RuleTree {
  constructor (patterns = [], debug = undefined) {
    // istanbul ignore next
    this._debug = debug || (() => undefined)
    /**
     * @type {TNode[]}
     * @private
     */
    this._tree = []
    this.previous = NIL
    patterns.forEach((pattern) => this.add(pattern))
  }

  add (pattern) {
    const parsed = parse(pattern), tree = this._tree
    const terminator = parsed[0] === parse.EXCL ? TERM_EX : TERM

    if (terminator === TERM_EX) parsed.shift()

    let parent = NIL, index

    for (const s of parsed) {
      if (s === GLOB) {
        index = tree.findIndex(([p, r]) => p === parent && r === s)
        if (index < 0) index = tree.push([parent, GLOB, 0]) - 1
      } else {
        index = tree.findIndex(([p, r]) => p === parent && r && r.source === s)
        if (index === NIL) {
          index = tree.push([parent, new RegExp(s), 0]) - 1
        }
        //  Todo: perhaps we should check flags on found node?
      }
      parent = index
    }
    assert(index >= 0, ME + ': no node created')
    const node = tree[index]
    if (node[2] !== 0) {
      this._debug(`add(${pattern}) i=${index} ${node[2]} <- ${terminator}`)
    }
    node[2] = terminator
    return this
  }

  dump () {
    return this._tree.map(([a, b, c]) => [a, b === GLOB ? GLOB : b.source, c])
  }

  inspect (index) {
    let [a, r, t] = this._tree[index]
    if (r !== GLOB) r = r.source
    return [a, r, t]
  }

  /**
   * Match the `string` against rules.
   *
   * The results array will be sorted: TERM_EX, TERM, non-GLOB, GLOB
   *
   * @param {string} string to match
   * @param {number=} ancestor node index or NIL (defaults to this.previous)
   * @param {boolean=} exact
   * @returns {Object<{flag:number, index:number, rule:*}>[]}
   */
  match (string, ancestor = undefined, exact = false) {
    const res = [], tree = this._tree, len = tree.length
    const previous = ancestor === undefined ? this.previous : ancestor

    for (let i = previous === NIL ? 0 : previous; i < len; i += 1) {
      let [a, rule, flag] = tree[i]
      if (a !== previous) continue
      if (exact && !flag) continue
      if (rule === GLOB ||
        (rule.test(string) && (rule = rule.source))) {
        res.push({ index: i, rule, flag })
      }
    }
    if (res.length > 1) {
      res.sort((a, b) => score_(b) - score_(a))
    }
    return res
  }

  test (string, ancestor = undefined) {
    const res = this.match(string, ancestor, true)
    return res.length ? res[0] : false
  }
}

exports = module.exports = RuleTree

Object.assign(exports, { GLOB, NIL, TERM, TERM_EX })
