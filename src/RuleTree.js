'use strict'

const { NO_MATCH, NOT_YET, GLOB, NIL } = require('./definitions')
const parse = require('./parse')
const Sincere = require('sincere')
const PAR = 0
const RUL = 1
const ACT = 2
const IDX = 3

/** @typedef TNode {Array<*>} */

/**
 * Rule tree and intermediate state of searches.
 */
class RuleTree extends Sincere {
  /**
   * @param {Array<*>=} rules
   * @param {number=} defaultAction
   */
  constructor (rules = undefined, defaultAction = undefined) {
    super()
    /**
     * @type {Array<TNode>}
     * @private
     */
    this._tree = []          //  Every node is an array [parenIndex, rule, action].
    /**
     * Used by test() method.
     * @type {Array<*> | undefined}
     */
    this.lastMatches = undefined
    this.defaultAction = defaultAction === undefined ? 0 : defaultAction
    if (rules) this.add(rules)
  }

  /**
   * Add new rules.
   *
   * @param {string | string[]} definition - slash-delimited expression[s]
   * @param {number=} action
   * @returns {RuleTree}
   */
  add (definition, action = undefined) {
    this.assert('add', 'no rules')
    if (typeof definition === 'string') {
      this.addPath_(definition, action)
    } else if (Array.isArray(definition)) {
      definition.forEach((rule) => this.add(rule, action))
    } else {
      throw new TypeError(this.sincereMessage(
        'add', ['bad definition', definition]))
    }
    return this
  }

  /**
   * @param {string} path
   * @param {number=} forAction
   * @param {number=} parentIndex
   * @returns {RuleTree}
   * @private
   */
  addPath_ (path, forAction = undefined, parentIndex = undefined) {
    const rules = parse(path), flags = rules.shift(), L = 'addPath_'

    this.assert(rules.length, L, 'no rules')
    const tree = this._tree, last = rules.length - 1
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
   * Clone of actual rule tree.
   * @type {Array<TNode>}
   */
  get tree () {
    return this._tree.map((node) => node.slice())
  }

  /**
   * Match the `string` against rules, without mutating object state.
   *
   * The results array will be sorted by action code, higher first.
   * A GLOB rule node is returned only if this is the only match.
   *
   * @param {string} string to match
   * @param {Array<*>=} ancestors - may be return value from previous call.
   * @returns {Array<TNode>} array of [iAnc, rule, action, index]
   */
  match (string, ancestors = undefined) {
    let ancs = (ancestors || [NIL]).slice(), res = []
    if (ancs.length && typeof ancs[0] !== 'number') {
      ancs = ancs.map((r) => r[IDX])
    }
    const lowest = Math.min.apply(undefined, ancs), tree = this._tree

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
          const i = ancs[a]             //  Here for debugging
          res.push(tree[i].concat(i))
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
   * @param {Array<*>=} ancestors - from earlier match().
   * @returns {number}            - action code.
   */
  test (string, ancestors = undefined) {
    if (this._tree.length === 0) return NOT_YET
    const res = this.match(string, ancestors || this.lastMatches)
    if (res.length) this.lastMatches = res
    return res.length ? res[0][ACT] : NO_MATCH
  }
}

exports = module.exports = RuleTree

Object.assign(exports, { ACT, GLOB, IDX, NIL, PAR, RUL })
