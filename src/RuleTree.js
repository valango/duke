/**
 * @module RuleTree
 */
'use strict'

const ME = 'RuleTree'

const assert = require('assert').strict
const { A_EXCL, A_NOPE, GLOB, NIL } = require('./definitions')
const parse = require('./parse')
const { format } = require('util')

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
      let rule = rules[i]
      const isDir = i < last || flags.isDirectory

      index = tree.findIndex(
        ([anc, r, t]) => {
          const y0 = anc === parent, y1 = t === isDir
          const y2 = (r === null ? r : r.source) === rule
          return y0 && y1 && y2
        })
      if (index === NIL) {
        if (rule) rule = RegExp(rule)
        index = tree.push([parent, rule, isDir, A_NOPE]) - 1
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
   * @param {boolean=} isDir
   * @param {number[]=} ancestors
   * @returns {number[][]} array of [iAnc, rule, bDir, action, index]
   */
  match (string, isDir = true, ancestors = undefined) {
    let res = []

    const ancs = (ancestors || [NIL]).slice(), tree = this.tree
    const lowest = Math.min.apply(undefined, ancs)

    if (lowest === Infinity) return res
    // Scan the three for nodes matching any of the ancestors.
    for (let i = tree.length; --i > lowest;) {
      const [an, rule, bDir, act] = tree[i]

      //  Ancestors list is always smaller than tree ;)
      for (let iA = 0, anc; (anc = ancs[iA]) !== undefined; iA += 1) {
        if (anc >= i) {   //  Ancestor index is always less than node index.
          ancs.splice(iA, 1) && (iA -= 1)   //  Discard this ancestor.
          continue
        }
        if (anc !== an) continue

        if ((bDir && !isDir) || (rule !== GLOB && !rule.test(string))) {
          if (an !== NIL && tree[an][1] === GLOB) {   //  No match, but...
            res.push(tree[an].concat(an))   //  if the ancestor rule is GLOB,
          }                                 //  then stick with it.
          continue
        }
        if (rule === GLOB) {
          const next = this.match(string, isDir, [i])
          if (next.length) {
            res = res.concat(next)
            continue
          }
        }
        //  idx:   0     1     2    3   4   //  We got match!
        res.push([an, rule, bDir, act, i])
        if (act === A_EXCL) break
      }
    }

    if (res.length > 1) {
      res = res.filter(([, r]) => r !== GLOB)
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
