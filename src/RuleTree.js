/**
 * @module RuleTree
 */
'use strict'

const ME = 'RuleTree'

const assert = require('assert').strict
const parse = require('./parse')

const TERM = 0
const EXCL = 1

const { GLOB } = parse

/**
 * @typedef TNode [parent, rule, flags]
 */

class RuleTree {
  constructor (patterns = []) {
    /**
     * @type {TNode[]}
     * @private
     */
    this._tree = []
    patterns.forEach((pattern) => this.add(pattern))
  }

  add (pattern) {
    const parsed = parse(pattern), tree = this._tree
    const terminator = parsed[0] === parse.EXCL ? EXCL : TERM

    if (terminator === EXCL) parsed.shift()

    let parent, rule, index

    for (const p of parsed) {
      if ((rule = p) !== GLOB) {
        index = tree.findIndex((r) =>
          r[0] === parent && r[1].source === rule)
        if (index < 0) {
          index = tree.push(
            [parent, new RegExp(rule), undefined]) - 1
        }
        //  Todo: perhaps we should check flags on found node?
      } else {
        index = tree.findIndex((r) =>
          r[0] === parent && r[1] === GLOB)
        if (index < 0) index = tree.push([parent, GLOB, undefined]) - 1
      }
      parent = index
    }
    assert(index >= 0, ME + ': no node created')
    const node = tree[index]
    if (node[2] !== undefined) {
      console.log(`add(${pattern}) i=${index} ${node[2]} <- ${terminator}`)
      node[2] = terminator
    }
  }

  match (parent, string) {
    const res = []
    for (let i = parent || 0, node; (node = this._tree[i]); i += 1) {
      if (node[0] !== parent) continue
      if (node[1] === GLOB || node[1].test(string)) {
        res.push({ i, parent: node[0], rule: node[1], flag: node[2] })
      }
    }
    if (res.length > 1) {
      const i = res.findIndex((r) => r.rule === GLOB)
      if (i >= 0) res.splice(i, 1)
    }
    return res
  }
}

exports = module.exports = RuleTree
