'use strict'

const { DO_NOTHING, T_DIR } = require('./constants')
const parsePath = require('./parsePath')
const Sincere = require('sincere')

const NIL = -1      //  No parent.
const optionalDirsRule = null
//  Tree node internal indexes.
const TYPE = 0
const RULE = 1
// const PARENT = 2
const ACTION = 3

const { max } = Math

const rule_ = (r) => r ? new RegExp(r) : optionalDirsRule

const typeMatch_ = (itemType, nodeType) => {
  return !nodeType || nodeType.indexOf(itemType) >= 0
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
 */
class Ruler extends Sincere {
  /**
   * @param {Object<{action:number, extended, optimize}>=} options
   * @param {...*} definitions
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

    super()

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
        this.assert((this._nextRuleAction = definition) !== DO_NOTHING,
          'add', 'action code 0 is reserved')
        break
      case 'string':
        this.addPath_(definition)
        break
      default:
        if (Array.isArray(definition)) {
          definition.forEach((item) => this.add_(item))
          // } else if (definition instanceof Ruler) {
          //  this.append_(definition)
        } else {
          this.assert(false, 'add', 'bad rule definition < %O >', definition)
        }
    }
    return this
  }

  /**
   * Append rules from another Ruler instance.
   * x@param {Ruler} other
   * x@private
   *
   append_ (other) {
    const src = other._tree.map(([t, r, p, a]) => [t, r ? r.source : r, p, a])
    const dst = this._tree

    src.forEach(([typ, rul, par, act], i) => {
      const grandPa = par === NIL ? NIL : src[par][PARENT]
      let j = dst.findIndex(
        ([t, r, p]) => p === grandPa && t === typ && (r ? r.source : r) === rul)
      if (j < 0) {
        j = dst.push([typ, rule_(rul), grandPa, act]) - 1
      }
      src[i][PARENT] = j
    })
  } */

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
    this.assert(parentIndex >= 0, 'addRules_', 'no node created')
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

    this.assert(rules.length, 'addPath_', 'no rules')
    let action = this._nextRuleAction
    if (flags.isExclusion) action = -action
    this.addRules_(rules, flags.type, action)
    return this
  }

  /**
   * Check the `itemName` against rules.
   *
   * The results array never contains ROOT node, which will be added on every run.
   * If a node of special action is matched, then only this node is returned.
   *
   * @param {string} itemName
   * @param {string=} itemType
   * @affects this._lastMatch
   * @returns {number} the most prevailing action among matches.
   */
  check (itemName, itemType = undefined) {
    const { _tree } = this, globs = []  //  Rules possibly globbing some directories.

    const ancestors = this._ancestors.map(([a, i]) => {    //  (action, ruleIndex)
      if (i > 0 && _tree[i][RULE] === optionalDirsRule) globs.push([a, i])
      return i
    })

    ancestors.push(0)       //  Always have root node!

    const res = this.match_(itemName, itemType, ancestors, [], []).concat(globs)
    this._lastMatch = res

    return res.reduce((acc, [a]) => max(acc, a), res[0][TYPE])
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

  /**
   * @param {string} itemName       - directory entry name.
   * @param {string} itemType       - directory entry type.
   * @param {number[]} ancestors    - rules (indexes) path to here.
   * @param {Array} res             - used on recursion.
   * @param {Array} toDeny          - used on recursion.
   * @returns {number[][]}          - (action, ruleIndex) pairs.
   * @private
   */
  match_ (itemName, itemType, ancestors, res, toDeny) {
    const lowest = -1  //  Todo: think if we can finish looping earlier.
    const { _tree } = this

    // Scan the three for nodes matching any of the ancestors.
    for (let i = _tree.length; --i > lowest;) {
      const [type, rule, par, act] = _tree[i]

      //  Ancestors list is always smaller than _tree ;)
      for (let iA = 0, anc; (anc = ancestors[iA]) !== undefined; iA += 1) {
        if (anc >= i) {   //  Ancestor index is always less than node index.
          ancestors.splice(iA, 1) && (iA -= 1)   //  Discard this ancestor.
          continue
        }
        if (anc !== par) continue

        if (rule !== optionalDirsRule &&
          !(typeMatch_(itemType, type) && rule.test(itemName))) {
          continue
        }
        if (rule === optionalDirsRule) {
          //  In case of optionalDirsRule, check it's descendants immediately.
          this.match_(itemName, itemType, [i], res, toDeny)
          if (i === 0) continue       //  Root node.
        }
        //  We got a real match!
        if (act < 0) {
          toDeny.push(-act)
        } else if (!res.find(([, j]) => j === i)) {
          res.push([act, i])
        }
      } //  end for iA
    } //  end for i

    if (toDeny.length) {
      res = res.filter(([a]) => toDeny.indexOf(a) < 0)
    }
    if (res.length === 0) {
      res.push([DO_NOTHING, NIL])
    }
    return res
  }
}

module.exports = Ruler
