'use strict'

const assert = require('assert-fine')
const { DO_NOTHING, DO_RETRY, T_DIR } = require('../constants')
const parsePath = require('./parsePath')

const { GLOB_DIRS } = parsePath
const NIL = -1                  //  No parent node in the rule tree.
//  Tree node internal indexes.
// const TYPE = 0
const RULE = 1
// const PARENT = 2
const ACTION = 3

const reserved = [DO_NOTHING, DO_RETRY, -DO_NOTHING]

const { max } = Math

const rule_ = (r) => r ? new RegExp(r) : GLOB_DIRS

const typeMatch_ = (itemType, nodeType) => !nodeType || (nodeType === itemType)

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
     * @protected
     */
    this._tree = [[T_DIR, GLOB_DIRS, NIL, DO_NOTHING]]

    /**
     * Pairs of (action, ruleIndex), set by clone(), used by check().
     * @type {number[][]}
     * @protected
     */
    this._ancestors = [[DO_NOTHING, NIL]]

    /**
     * Array of (action, ruleIndex) set by check(), exposed via `lastMatch` property.
     * @type {number[][]}
     * @protected
     */
    this._lastMatch = []

    /**
     * Action to be bound to next rule - used and possibly mutated by add().
     * @type {number}
     * @protected
     */
    this._nextRuleAction = undefined

    /**
     * Options for string parser.
     * @type {Object}
     * @protected
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

  /**
   * Internal wrapper around `addPath_()`.
   * @param {number|string|Array} definition
   * @returns {Ruler}
   * @protected
   */
  add_ (definition) {
    switch (typeof definition) {
      case 'number':
        assert(!reserved.includes(definition), 'Ruler: action code %i is reserved', definition)
        this._nextRuleAction = definition
        break
      case 'string':
        this.addPath_(definition)
        break
      default:
        if (definition instanceof Array) {
          definition.forEach((item) => this.add_(item))
        } else {
          assert(false, 'Ruler: bad rule definition %o', definition)
        }
    }
    return this
  }

  /**
   * Parses the rule definition and calls the addRules_() method.
   * @param {string} definition
   * @returns {Ruler}
   * @protected
   */
  addPath_ (definition) {
    const rules = parsePath(definition, this._options)
    const flags = rules.shift()

    assert(rules.length, 'Ruler: empty definition %o', definition)
    let action = this._nextRuleAction
    assert(action !== undefined, 'Ruler: definition %o has no action code', definition)
    if (flags.isExclusion) action = -action
    this.addRules_(rules, flags.type, action)
    return this
  }

  /**
   * Adds new rules to the tree.
   * @param {string[]} rules
   * @param type
   * @param action
   * @protected
   */
  addRules_ (rules, type, action) {
    const last = rules.length - 1, { _tree } = this
    let parentIndex = NIL

    rules.forEach((rule, ruleIndex) => {
      const t = ruleIndex < last ? T_DIR : type
      const nodeIndex = _tree.findIndex(
        ([typ, rul, par, act]) => {
          const y0 = par === parentIndex && typeMatch_(t, typ)
          const y1 = (rul === GLOB_DIRS ? rul : rul.source) === rule
          const y2 = ruleIndex < last || (act === action) || act === DO_NOTHING
          return y0 && y1 && y2
        })

      if (nodeIndex === -1) {
        parentIndex = _tree.push([t, rule_(rule), parentIndex, DO_NOTHING]) - 1
      } else {
        parentIndex = nodeIndex
      }
    })
    assert(parentIndex >= 0, 'Ruler: could not understand %o', rules)
    _tree[parentIndex][ACTION] = action
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
    const { _tree } = this, maskedActions = []

    let ancestors = [], matches = [], news = this._ancestors.map(([, i]) => i)

    if (news.indexOf(0) < 0) news.push(0)

    while (news.length !== 0) {
      ancestors = ancestors.concat(news).sort((a, b) => b - a)
      news = []

      for (const ancestor of ancestors) {
        for (let i = _tree.length; --i > ancestor;) {
          const [type, rule, parent, act] = _tree[i]

          if (parent === ancestor) {
            if (rule === GLOB_DIRS ||
              (typeMatch_(entryType, type) && rule.test(entryName))) {
              if (matches.find(([, ruleIndex]) => ruleIndex === i)) continue
              matches.push([act, i])
              if (act < 0) maskedActions.push(-act)
              if (rule === GLOB_DIRS && ancestors.indexOf(i) < 0) {
                news.push(i)
              }
            }
          }
        }
      }
    }

    if (entryType !== T_DIR) {
      matches = matches.filter(([, i]) => _tree[i][RULE] !== GLOB_DIRS)
    }
    if (maskedActions.length !== 0) {
      for (let i = matches.length; --i >= 0;) {
        if (maskedActions.indexOf(matches[i][0]) >= 0) {
          matches[i][0] = DO_NOTHING
        }
      }
    }
    this._lastMatch = matches

    return matches.reduce((acc, [a]) => max(acc, a), 0)
  }

  /**
   * Create copy of the instance.
   * @param {*=} ancestors array for the new instance or:
   *   - `true` to use `_lastMatch` instance property;
   *   - falsy  to use own `_ancestors` property.
   * @returns {Ruler}
   */
  clone (ancestors = false) {
    let a = ancestors
    const c = new Ruler(this._options)

    if (!(a instanceof Array)) {
      a = (a && this._lastMatch) || this._ancestors
    }
    c._ancestors = a.slice()
    c._nextRuleAction = DO_NOTHING  //  Do not forward the parsing status.
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
   * Get the detailed results of a recent `check()` call.
   * @returns {undefined|number[][]}
   */
  get lastMatch () {
    return this._lastMatch && this._lastMatch.slice()
  }
}

module.exports = Ruler
