/**
 * @module RuleTree
 */
'use strict'

const ME = 'RuleTree'

const assert = require('assert').strict
const { A_EXCL, A_NOPE, NIL, T_DIR, T_ANY } = require('./definitions')
const parse = require('./parse')
const { format } = require('util')

const { ANY } = parse
const R_ANY = /./

//  Used for results sorting.
/*
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
*/

class RuleTree {
  constructor (patterns = [], debug = undefined) {
    // istanbul ignore next
    this._debug = debug || (() => undefined)
    this.tree = []          //  Every node is an array [parenIndex, rule, flag].
    this.lastIndex = NIL    //  Set by user
    this.lastMatches = []   //  Set by test()
    patterns.forEach((pattern) => this.add(pattern))
  }

  /**
   *
   * @param {string[] | {pattern:string, mask:string}} givenRules
   * @param forAction
   * @returns {RuleTree}
   */
  add (givenRules, forAction = A_NOPE) {
    //  Todo: implement type calculation, screening and negation
    let rules = givenRules, flags = {}
    assert(rules[0], 'no rules')
    if (typeof rules === 'string') {
      rules = parse(rules)
      flags = rules.shift()
    } else {
      throw new TypeError('bad rules')
    }
    const tree = this.tree, last = rules.length - 1
    const action = flags.isExclusion ? A_EXCL : forAction

    let parent = this.lastIndex, index

    for (let i = 0; i <= last; i += 1) {
      const rule = rules[i]
      const type = flags.hasDirs
        ? (flags.allDirs || i < last ? T_DIR : T_ANY) : T_ANY

      index = tree.findIndex(
        ([anc, r, t]) => anc === parent && t === type &&
          (typeof r === 'string' ? r : r.source) === rule)
      if (index === NIL) {
        index = tree.push(
          [parent, rule === ANY ? R_ANY : RegExp(rule), type, A_NOPE]) - 1
      }
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
   * @param type
   * @param {number=} ancestor node index or NIL (defaults to this.lastIndex)
   * @returns {Object<{flag:number, index:number, rule:*}>[]}
   */
  match (string, type, ancestor = undefined) {
    let res = []
    const parent = ancestor === undefined ? this.lastIndex : ancestor
    const tree = this.tree, len = tree.length

    // while ((parent = parents.pop()) !== undefined) {
    for (let i = parent === NIL ? 0 : parent; i < len; i += 1) {
      const [anc, rule, typ, act] = tree[i]
      if (anc !== parent || (typ !== T_ANY && typ !== type) ||
        !rule.test(string)) {
        continue
      }
      res.push([i, rule, typ, act])
      if (act === A_EXCL) break
    }

    if (res.length > 1) {
      res = res.filter(([, r]) => r !== R_ANY)
    }
    if (res.length > 1) {
      res.sort((a, b) => b[3] - a[3])
    }
    return res
  }

  /**
   * Rigid version of match()
   * @param {string} string
   * @param type
   * @param {number=} ancestor node index or NIL (defaults to this.lastIndex)
   * @returns {Object<{flag:number, index:number, rule:*}> | false}
   */
  test (string, type, ancestor = undefined) {
    const res = this.match(string, type, ancestor, true)
    this.lastMatches = res
    return res.length ? res[0][3] : A_EXCL
  }
}

exports = module.exports = RuleTree
