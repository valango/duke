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

//  Used for results sorting.
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
    this.tree = []      //  Every node is an array [parenIndex, rule, flag].
    this.parent = NIL
    patterns.forEach((pattern) => this.add(pattern))
  }

  add (pattern) {
    const parsed = parse(pattern), tree = this.tree
    const term = parsed[0] === parse.EXCL ? TERM_EX : TERM

    if (term === TERM_EX) parsed.shift()

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
    assert(!term || node[1] !== GLOB, `${ME}: '${pattern}' can't be terminal`)
    if (node[2] !== 0) {
      this._debug(`add(${pattern}) i=${index} ${node[2]} <- ${term}`)
    }
    node[2] = term
    return this
  }

  /**
   * Match the `string` against rules.
   *
   * The results array will be sorted: TERM_EX, TERM, non-GLOB, GLOB
   *
   * @param {string} string to match
   * @param {number=} ancestor node index or NIL (defaults to this.parent)
   * @param {boolean=} exact
   * @returns {Object<{flag:number, index:number, rule:*}>[]}
   */
  match (string, ancestor = undefined, exact = false) {
    let parent = ancestor === undefined ? this.parent : ancestor
    const tree = this.tree, len = tree.length, parents = [parent], res = []

    while ((parent = parents.pop()) !== undefined) {
      for (let i = parent === NIL ? 0 : parent; i < len; i += 1) {
        let [a, rule, flag] = tree[i]
        if (a !== parent) continue
        if (rule !== GLOB) {
          if (!rule.test(string)) continue
          rule = rule.source
        }
        parents.push(i)
        if (flag || !exact) res.push({ index: i, rule, flag })
      }
    }

    if (res.length > 1) {
      res.sort((a, b) => score_(b) - score_(a))
    }
    return res
  }

  /**
   * Rigid version of match()
   * @param {string} string
   * @param {number=} ancestor node index or NIL (defaults to this.parent)
   * @returns {Object<{flag:number, index:number, rule:*}> | false}
   */
  test (string, ancestor = undefined) {
    const res = this.match(string, ancestor, true)
    return res.length ? res[0] : false
  }
}

exports = module.exports = RuleTree

Object.assign(exports, { GLOB, NIL, TERM, TERM_EX })
