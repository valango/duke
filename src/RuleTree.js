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

class RuleTree {
  constructor (patterns = [], debug = undefined) {
    this._debug = debug || (() => undefined)
    /**
     * @type {TNode[]}
     * @private
     */
    this._tree = []
    patterns.forEach((pattern) => this.add(pattern))
  }

  add (pattern) {
    const parsed = parse(pattern), tree = this._tree
    const terminator = parsed[0] === parse.EXCL ? TERM_EX : TERM

    if (terminator === TERM_EX) parsed.shift()

    let parent = NIL, index

    for (const s of parsed) {
      if (s === GLOB) {
        index = tree.findIndex(([p, r]) => p === parent && r === GLOB)
        if (index < 0) index = tree.push([parent, GLOB, 0]) - 1
      } else {
        index = tree.findIndex(([p, r]) => p === parent && r.source === s)
        if (index === NIL) {
          index = tree.push([parent, new RegExp(s), 0]) - 1
        }
        //  Todo: perhaps we should check flags on found node?
      }
      parent = index
    }
    assert(index >= 0, ME + ': no node created')
    const node = tree[index]
    if (node[2] !== undefined) {
      this._debug(`add(${pattern}) i=${index} ${node[2]} <- ${terminator}`)
      node[2] = terminator
    }
  }

  dump () {
    return this._tree.map(([a, b, c]) => [a, b === GLOB ? GLOB : b.source, c])
  }

  inspect (index) {
    let [a, b, c] = this._tree[index]
    if (a !== GLOB) a = a.source
    return [a, b, c]
  }

  /**
   * Compute matching rule node indexes.
   *
   * @param {number} ancestor node index or NIL
   * @param {string} string to match
   * @param {boolean=} all in one of multiple matches was GLOB, keep it.
   * @returns {number[]}
   */
  match (ancestor, string, all = false) {
    const res = [], tree = this._tree, len = tree.length

    for (let i = ancestor === NIL ? 0 : ancestor; i < len; i += 1) {
      const [a, r] = tree[i]
      if (a !== ancestor) continue
      if (r === GLOB || r.test(string)) res.push(i)
    }
    if (all || res.length <= 1) return res
    return res.filter((i) => tree[i][1] !== GLOB)
  }
}

exports = module.exports = RuleTree

Object.assign(exports, { NIL, TERM, TERM_EX })
