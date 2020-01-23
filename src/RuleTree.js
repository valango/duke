'use strict'

const { DO_DISCARD, DO_CONTINUE, GLOB, NIL } = require('./definitions')
const parse = require('./parse')
const Sincere = require('sincere')
// const PAR = 0
const RUL = 1
const ACT = 2
const IDX = 3

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
     * Rule tree of nodes [parentIndex, rule, action].
     * @type Array<Array<*>>
     * @private
     */
    this._tree = []
    /**
     * Used internally by add()
     * @type {*}
     * @private
     */
    this._lastItem = undefined
    /**
     * Used internally by add()
     * @type {number}
     * @private
     */
    this._level = 0
    /**
     * Action to be bound to new rule - used and possibly mutated by add().
     * @type {number}
     */
    this.defaultAction = defaultAction === undefined ? 0 : defaultAction
    if (rules) this.add(rules)
  }

  /**
   * Add new rules. If the first item in definitions array is not string,
   * it will be treated as action code, which will prevail over default action.
   *
   * If `definition` is an array, then every numeric member will be interpreted as
   * action code for following rule(s). Array may be nested.
   *
   * @param {*} definition
   * @param {number=} action
   * @returns {RuleTree}
   */
  add (definition, action = undefined) {
    this._level += 1
    this._lastItem = definition
    this.assert('add', 'no rules')

    switch (typeof definition) {
      case 'number':
        this.defaultAction = definition
        break
      case 'string':
        this.addPath_(definition, action)
        break
      default:
        if (Array.isArray(definition)) {
          definition.forEach((item) => this.add(item, action))
        } else {
          this.assert(false, 'add', 'bad rule definition < %O >', definition)
        }
    }
    this.assert((--this._level > 0) || typeof this._lastItem !== 'number',
      'add', 'pending action code %i in rule < %O >',
      this._lastItem, definition)

    return this
  }

  /**
   * @param {string} path
   * @param {number=} forAction
   * @returns {RuleTree}
   * @private
   */
  addPath_ (path, forAction = undefined) {
    const rules = parse(path), flags = rules.shift(), L = 'addPath_'

    this.assert(rules.length, L, 'no rules')
    const tree = this._tree, last = rules.length - 1
    let action = flags.isExclusion ? DO_DISCARD : forAction
    if (action === undefined) action = this.defaultAction
    this.assert(action > DO_CONTINUE, L, 'illegal action value \'%i\'', action)

    let index, parent = NIL // parentIndex === undefined ? NIL : parentIndex

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
        index = tree.push([parent, rule, DO_CONTINUE]) - 1
      }
      parent = index
    }
    this.assert(index >= 0, L, 'no node created')
    this.treeTop = index + 1
    const node = tree[index], [p, r, a] = node

    if (a !== action) {
      if (a !== DO_CONTINUE) {  //  For debugger breakpoint.
        this.assert(false, L, 'action conflict @%i: [%i, %s, %i]',
          index, p, r, a)
      }
      node[2] = action
    }

    return this
  }

  /**
   * Copy the internal rule tree - intended for testing / debugging.
   * @returns {Array<Array<*>>}
   */
  dump () {
    return this._tree.slice()
  }

  /**
   * Match the `string` against rules, without mutating object state.
   *
   * The results array will be sorted by action code, higher first.
   * A GLOB rule node is returned only if this is the only match.
   *
   * @param {string} string to match
   * @param {Array<*>=} ancestors - may be return value from previous call.
   * @returns {Array<Array<*>>} array of [ancestorIndex, rule, action, ownIndex]
   */
  match (string, ancestors = undefined) {
    let ancs = (ancestors || [NIL]).slice(), res = []
    if (ancs.length && typeof ancs[0] !== 'number') {
      ancs = ancs.map((r) => r[IDX])
    }
    const lowest = Math.min.apply(undefined, ancs), tree = this._tree

    if (lowest !== Infinity) {
      // Scan the three for nodes matching any of the ancestors.
      for (let i = this.treeTop; --i > lowest;) {
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
          //  We got a match!
          res.push([par, rule, act, i])
          if (act === DO_DISCARD) break
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
   *
   * @param {string} string
   * @param {Array<*>=} ancestors - from earlier match().
   * @returns {Array<number>}     - [action code, ancestors].
   */
  test (string, ancestors = undefined) {
    if (this._tree.length === 0) return DO_CONTINUE   //  Todo: what's this?
    const res = this.match(string, ancestors || [NIL])
    if (res.length === 0) return [DO_DISCARD, ancestors]
    return [res[0][ACT], res]
  }
}

module.exports = RuleTree
