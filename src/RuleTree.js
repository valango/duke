/**
 * @module RuleTree
 */
'use strict'

const ME = 'RuleTree'

const assert = require('assert').strict
const { A_EXCL, A_NOPE, NIL } = require('./definitions')
const parse = require('./parse')
const { format } = require('util')

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
    this.lastIndex = NIL
    patterns.forEach((pattern) => this.add(pattern))
  }

  /**
   *
   * @param {string[] | {pattern:string, mask:string}} givenRules
   * @param forAction
   * @returns {RuleTree}
   */
  add (givenRules, forAction = A_NOPE) {
    let rules = givenRules
    assert(rules[0], 'no rules')
    if (typeof rules === 'string') {
      rules = parse(rules)
    } else {
      throw new TypeError('bad rules')
    }
    const tree = this.tree
    const action = rules[0] === parse.EXCL ? rules.shift() && A_EXCL : forAction

    let parent = this.lastIndex, index

    for (const [rule, type] of rules) {
      index = tree.findIndex(
        ([anc, r, t]) => anc === parent && t === type &&
          (typeof r === 'string' ? r : r.source) === rule)
      if (index === NIL) {
        index = tree.push([parent, rule, type]) - 1
      }
      //  Todo: perhaps we should check flags on found node?
      parent = index
    }
    assert(index >= 0, ME + ': no node created')
    const node = tree[index], act = node[3]

    if (act === undefined || act === A_NOPE || act === action) {
      node[3] = action
    } else {
      assert(0, format('action conflict @%i: [%i, $s, %s, %i] < %i',
        index, node[0], node[1], node[2], node[3], action))
    }

    return this
  }

  /**
   * Match the `string` against rules.
   *
   * The results array will be sorted: TERM_EX, TERM, non-GLOB, GLOB
   *
   * @param {string} string to match
   * @param {number=} ancestor node index or NIL (defaults to this.lastIndex)
   * @param {boolean=} exact
   * @returns {Object<{flag:number, index:number, rule:*}>[]}
   */
  match (string, ancestor = undefined, exact = false) {
    let parent = ancestor === undefined ? this.lastIndex : ancestor
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
   * @param {number=} ancestor node index or NIL (defaults to this.lastIndex)
   * @returns {Object<{flag:number, index:number, rule:*}> | false}
   */
  test (string, ancestor = undefined) {
    const res = this.match(string, ancestor, true)
    return res.length ? res[0] : false
  }
}

exports = module.exports = RuleTree

Object.assign(exports, { GLOB, NIL, TERM, TERM_EX })
