/**
 * @module RuleTree
 */
'use strict'

const { NO_MATCH, NOT_YET, GLOB, NIL } = require('./definitions')
const parse = require('./parse')
const Assertive = require('./Assertive')

class RuleTree extends Assertive {
  constructor (rules = undefined, forAction = 0) {
    super()
    this.tree = []          //  Every node is an array [parenIndex, rule, flag].
    this.lastIndex = NIL    //  Set by user
    this.defaultAction = forAction
    if (rules) this.add(rules, forAction)
  }

  add (rules, action = undefined) {
    this.assert('add', 'no rules')
    if (typeof rules === 'string') {
      this.addPath(rules, action)
    } else if (Array.isArray(rules)) {
      rules.forEach((rule) => this.add(rule))
    } else {
      throw new TypeError(this.diagnosticMessage('add', ['bad rules']))
    }
    return this
  }

  addPath (path, forAction = undefined) {
    const rules = parse(path), flags = rules.shift(), L = 'addPath'

    this.assert(rules.length, L, 'no rules')
    const tree = this.tree, last = rules.length - 1
    let action = flags.isExclusion ? NO_MATCH : forAction
    if (action === undefined) action = this.defaultAction
    this.assert(action > NOT_YET, L, 'illegal action value \'%i\'', action)

    let parent = this.lastIndex, index

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
    let res = []

    const ancs = (ancestors || [NIL]).slice(), tree = this.tree
    const lowest = Math.min.apply(undefined, ancs)

    if (lowest === Infinity) return res
    // Scan the three for nodes matching any of the ancestors.
    for (let i = tree.length; --i > lowest;) {
      const [an, rule, act] = tree[i]

      //  Ancestors list is always smaller than tree ;)
      for (let iA = 0, anc; (anc = ancs[iA]) !== undefined; iA += 1) {
        if (anc >= i) {   //  Ancestor index is always less than node index.
          ancs.splice(iA, 1) && (iA -= 1)   //  Discard this ancestor.
          continue
        }
        if (anc !== an) continue

        if (rule !== GLOB && !rule.test(string)) {
          /*
          if (an !== NIL && tree[an][1] === GLOB) {   //  No match, but...
            res.push(tree[an].concat(an))   //  if the ancestor rule is GLOB,
          }                                 //  then stick with it.
          */
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
        //  idx:   0     1    2  3    //  We got match!
        res.push([an, rule, act, i])
        if (act === NO_MATCH) break
      }
    }

    if (!res.length) {
      const a = ancs.findIndex((i) => tree[i][1] === GLOB)
      if (a >= 0) {
        res.push(tree[a].concat(a))
      }
    } else if (res.length > 1) {
      res = res.filter(([, r]) => r !== GLOB)
    }
    if (res.length > 1) {
      res.sort((a, b) => b[2] - a[2])
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
    return res.length ? res[0][3] : NO_MATCH
  }
}

exports = module.exports = RuleTree
