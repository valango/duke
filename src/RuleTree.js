/**
 * @module RuleTree
 */
'use strict'

const { NO_MATCH, NOT_YET, GLOB, NIL } = require('./definitions')
const parse = require('./parse')
const Assertive = require('./Assertive')
const PAR = 0
const RUL = 1
const ACT = 2
const IDX = 3

class RuleTree extends Assertive {
  constructor (rules = undefined, forAction = undefined) {
    super()
    this.tree = []          //  Every node is an array [parenIndex, rule, action].
    /**
     * Used by test() method.
     * @type {*[] | undefined}
     */
    this.lastMatches = undefined
    this.defaultAction = forAction
    if (rules) this.add(rules, forAction)
  }

  add (rules, action = undefined) {
    this.assert('add', 'no rules')
    if (typeof rules === 'string') {
      this.addPath(rules, action)
    } else if (Array.isArray(rules)) {
      rules.forEach((rule) => this.add(rule, action))
    } else {
      throw new TypeError(this.diagnosticMessage('add', ['bad rules']))
    }
    return this
  }

  addPath (path, forAction = undefined, parentIndex = undefined) {
    const rules = parse(path), flags = rules.shift(), L = 'addPath'

    this.assert(rules.length, L, 'no rules')
    const tree = this.tree, last = rules.length - 1
    let action = flags.isExclusion ? NO_MATCH : forAction
    if (action === undefined) action = this.defaultAction
    this.assert(action > NOT_YET, L, 'illegal action value \'%i\'', action)

    let index, parent = parentIndex === undefined ? NIL : parentIndex

    for (let i = 0; i <= last; i += 1) {
      let rule = rules[i]

      index = tree.findIndex(
        ([a, r]) => {
          const y0 = a === parent
          const y1 = (r === null ? r : r.source) === rule
          return y0 && y1
        })
      if (index === -1) {
        if (rule) rule = RegExp(rule)
        index = tree.push([parent, rule, NOT_YET]) - 1
      }
      parent = index
    }
    this.assert(index >= 0, L, 'no node created')
    const node = tree[index], [p, r, a] = node

    if (a !== action) {
      if (a !== NOT_YET) {  //  For debugger breakpoint.
        this.assert(false, L, 'action conflict @%i: [%i, %s, %i]',
          index, p, r, a)
      }
      node[2] = action
    }

    return this
  }

  /**
   * Match the `string` against rules.
   *
   * The results array will be sorted: TERM_EX, TERM, non-GLOB, GLOB
   *
   * @param {string} string to match
   * @param {number[]=} ancestors
   * @returns {number[][]} array of [iAnc, rule, bDir, action, index]
   */
  match (string, ancestors = undefined) {
    let ancs = (ancestors || [NIL]).slice(), res = []
    if (ancs.length && typeof ancs[0] !== 'number') {
      if (typeof ancs.map !== 'function') {
        ancs.map = 0
      }
      ancs = ancs.map((r) => r[IDX])
    }
    const lowest = Math.min.apply(undefined, ancs), tree = this.tree

    if (lowest !== Infinity) {
      // Scan the three for nodes matching any of the ancestors.
      for (let i = tree.length; --i > lowest;) {
        const [par, rule, act] = tree[i]

        //  Ancestors list is always smaller than tree ;)
        for (let iA = 0, anc; (anc = ancs[iA]) !== undefined; iA += 1) {
          if (anc >= i) {   //  Ancestor index is always less than node index.
            ancs.splice(iA, 1) && (iA -= 1)   //  Discard this ancestor.
            continue
          }
          if (anc !== par) continue

          if (rule !== GLOB && !rule.test(string)) {
            continue
          }
          if (rule === GLOB) {
            let next = this.match(string, [i])
            next = next.filter((o) => o[1] !== GLOB)
            if (next.length) {
              res = res.concat(next)
              continue
            }
          }
          ///  We got match!
          res.push([par, rule, act, i])
          if (act === NO_MATCH) break
        }
      }

      if (!res.length) {
        const a = ancs.findIndex((i) => tree[i] && tree[i][RUL] === GLOB)
        if (a >= 0) {
          res.push(tree[a].concat(a))
        }
      } else if (res.length > 1) {
        res = res.filter(([, r]) => r !== GLOB)
      }
      if (res.length > 1) {
        res.sort((a, b) => b[ACT] - a[ACT])
      }
    }
    return res
  }

  /**
   * Rigid version of match().
   * NB: this method uses and affects the `lastMatches` property!
   *
   * @param {string} string
   * @param {*[]=} ancestors
   * @returns {number}            action code
   */
  test (string, ancestors = undefined) {
    const res = this.match(string, ancestors || this.lastMatches)
    if (res.length) this.lastMatches = res
    return res.length ? res[0][ACT] : NO_MATCH
  }
}

exports = module.exports = RuleTree

Object.assign(exports, { ACT, GLOB, IDX, NIL, PAR, RUL })
