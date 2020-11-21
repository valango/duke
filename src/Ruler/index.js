'use strict'

const assert = require('assert-fine')
const { DO_NOTHING, T_DIR } = require('../constants')
const parsePath = require('./parsePath')

const NIL = -1      //  No parent.
const optionalDirsRule = null
//  Tree node internal indexes.
// const TYPE = 0
const RULE = 1
// const PARENT = 2
const ACTION = 3

const { max } = Math

const rule_ = (r) => r ? new RegExp(r) : optionalDirsRule

const typeMatch_ = (itemType, nodeType) => {
  return !nodeType || (nodeType === itemType)
}

/**
 * @param {number[][]} tuples
 * @param {number} action
 * @returns {boolean} true if there was a tuple with the `action`.
 * @private
 */
const hasAction_ = (tuples, action) => {
  return !!(tuples && tuples.find(([a]) => a === action))
}

/**
 * Rule tree and intermediate state of searches.
 * @class
 */
class Ruler {
  /**
   * @param {Object<{action:number, extended, optimize}>=} options
   * @param {...*} definitions
   * @constructor
   */
  constructor (options = undefined, ...definitions) {
    const o = {}, rules = definitions.slice()   //  May be an empty array.
    let opts = options

    if (opts !== undefined) {
      if ((typeof opts === 'object' && opts.constructor !== o.constructor) ||
        typeof opts !== 'object') {
        rules.unshift(opts) && (opts = o)
        opts = undefined
      }
    }
    opts = { ...opts }

    /**
     * Rule tree of nodes [entryType, rule, parent, action].
     * NB: negative action code means the action is masked out!
     * @type {any[][]}
     * @private
     */
    this._tree = [[T_DIR, optionalDirsRule, NIL, DO_NOTHING]]

    /**
     * Pairs of (action, ruleIndex), set by clone(), used by check() and hadAction() method.
     * @type {number[][]}
     * @private
     */
    this._ancestors = [[DO_NOTHING, NIL]]

    /**
     * Array of (action, ruleIndex) set by check(), used by clone() and hasAction() method.
     * @type {number[][] | undefined}
     * @private
     */
    this._lastMatch = undefined

    /**
     * Action to be bound to next rule - used and possibly mutated by add().
     * @type {number}
     * @private
     */
    this._nextRuleAction = DO_NOTHING

    /**
     * Options for string parser.
     * @type {Object}
     * @private
     */
    this._options = opts

    this.add(rules)
  }

  /**
   * Add new rules. If the first item in definitions array is not string,
   * it will be treated as action code, which will prevail over default action.
   *
   * If `definition` is an array, then every numeric member will be interpreted as
   * action code for following rule(s). Array may be nested.
   *
   * @param {...*} args any of {Array|Ruler|number|string}
   * @returns {Ruler}
   */
  add (...args) {
    return this.add_(args)
  }

  /** @private */
  add_ (definition) {
    switch (typeof definition) {
      case 'number':
        assert((this._nextRuleAction = definition) !== DO_NOTHING,
          'add', 'action code 0 is reserved')
        break
      case 'string':
        if (definition === '/*/**/a') {
          definition = '/*/**/a'
        }
        this.addPath_(definition)
        break
      default:
        if (Array.isArray(definition)) {
          definition.forEach((item) => this.add_(item))
          // } else if (definition instanceof Ruler) {
          //  this.append_(definition)
        } else {
          assert(false, 'add', () => `bad rule definition '${definition}'`)
        }
    }
    return this
  }

  /** @private */
  addRules_ (rules, type, action) {
    const last = rules.length - 1, { _tree } = this
    let parentIndex = NIL

    rules.forEach((rule, ruleIndex) => {
      const t = ruleIndex < last ? T_DIR : type
      const nodeIndex = _tree.findIndex(
        ([typ, rul, par, act]) => {
          const y0 = par === parentIndex && typeMatch_(t, typ)
          const y1 = (rul === optionalDirsRule ? rul : rul.source) === rule
          const y2 = ruleIndex < last || (act === action) || act === DO_NOTHING
          return y0 && y1 && y2
        })

      if (nodeIndex === -1) {
        parentIndex = _tree.push([t, rule_(rule), parentIndex, DO_NOTHING]) - 1
      } else {
        parentIndex = nodeIndex
      }
    })
    assert(parentIndex >= 0, 'addRules_', 'no node created')
    _tree[parentIndex][ACTION] = action
  }

  /**
   * @param {string} path
   * @returns {Ruler}
   * @private
   */
  addPath_ (path) {
    const rules = parsePath(path, this._options)
    const flags = rules.shift()

    assert(rules.length, 'addPath_', 'no rules')
    let action = this._nextRuleAction
    if (flags.isExclusion) action = -action
    this.addRules_(rules, flags.type, action)
    return this
  }

  /**
   * Check the rules with present ancestors against the given entry.
   *
   * @param {string} entryName
   * @param {TEntryType=} entryType
   * @affects this._lastMatch
   * @returns {number} the most prevailing action among matching rules.
   */
  check (entryName, entryType = undefined) {
    const { _tree } = this, masked = []

    let ancestors = [], matches = [], news = this._ancestors.map(([, i]) => i)

    if (news.indexOf(0) < 0) news.push(0)

    while (news.length !== 0) {
      ancestors = ancestors.concat(news).sort((a, b) => b - a)
      news = []

      for (let iA = 0, anc; (anc = ancestors[iA]) !== undefined; iA += 1) {
        for (let i = _tree.length; --i > anc;) {
          const [type, rule, par, act] = _tree[i]

          if (par !== anc) continue
          if (rule === optionalDirsRule ||
            (typeMatch_(entryType, type) && rule.test(entryName))) {
            if (matches.find(([, idx]) => idx === i)) continue
            matches.push([act, i])
            if (act < 0) masked.push(-act)
            if (rule === optionalDirsRule && ancestors.indexOf(i) < 0) {
              news.push(i)
            }
          }
        }
      }
    }

    if (entryType !== T_DIR) {
      matches = matches.filter(([, i]) => _tree[i][RULE] !== optionalDirsRule)
    }
    if (masked.length !== 0) {
      for (let i = matches.length; --i > 0;) {
        if (masked.indexOf(matches[i][0]) >= 0) {
          matches[i][0] = DO_NOTHING
        }
      }
    }
    this._lastMatch = matches

    return matches.reduce((acc, [a]) => max(acc, a), 0)
  }

  /**
   * Create copy of the instance.
   * @param {*=} ancestors array or:
   *   - `true` means use `_lastMatch` instance property w fallback to `_ancestors`
   *   - falsy value means use `_ancestors` property.
   * @returns {Ruler}
   */
  clone (ancestors = false) {
    let a = ancestors
    const c = new Ruler(this._options)

    if (!Array.isArray(a)) {
      a = (a && this._lastMatch) || this._ancestors
    }
    c._ancestors = a.slice()
    c._nextRuleAction = this._nextRuleAction
    c._tree = this._tree.slice()

    return c
  }

  /**
   * A plug-in socket for diagnostic dump method.
   * @param {Array<string>|string|number=} options which members to show and how.
   * @returns {string|undefined} NB: always undefined in production mode!
   */
  //  istanbul ignore next
  dump (options = undefined) {
  }

  /**
   * Check if any of ancestors contains given action.
   * @param {number} action
   * @returns {boolean}
   */
  hadAction (action) {
    return hasAction_(this._ancestors, action)
  }

  /**
   * Check if results from recent match contain given action.
   * @param {number} action
   * @returns {boolean}
   */
  hasAction (action) {
    return hasAction_(this._lastMatch, action)
  }

  get lastMatch () {
    return this._lastMatch && this._lastMatch.slice()
  }
}

module.exports = Ruler
