'use strict'

const { T_ANY, T_DIR } = require('./constants')
const parse = require('./parse')
const Sincere = require('sincere')
const CONTINUE = 0
const { GLOB } = parse
const NIL = -1
const ROOT = 0
//  Tree node constants.
// const TYP = 0
const RUL = 1
const PAR = 2
const ACT = 3

const rule_ = (r) => r ? new RegExp(r) : r

const typeMatch_ = (itemType, nodeType) => {
  return !nodeType || nodeType.indexOf(itemType) >= 0
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
    const rules = definitions.slice(), o = {}
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
     * Rule tree of nodes [rule, parent, action].
     * @type Array<Array<*>>
     * @private
     */
    this._tree = [[T_DIR, GLOB, NIL, CONTINUE]]

    /**
     * Used and mutated by test() method.
     * @type {Array<Array>|undefined}
     */
    this.ancestors = [[CONTINUE, NIL]]

    /**
     * Most recent result from internal match_() method.
     * @type {Array|undefined}
     */
    this.lastMatch = undefined

    /**
     * Action to be bound to next rule - used and possibly mutated by add().
     * @type {number}
     */
    this.nextRuleAction = opts.nextRuleAction === undefined
      ? 0 : opts.nextRuleAction

    /**
     * Options for string parser.
     * @type {Object}
     */
    this.options = opts

    if (rules) this.add(rules)
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
        this.assert((this.nextRuleAction = definition) !== CONTINUE,
          'add', 'action code 0 is reserved')
        break
      case 'string':
        this.addPath_(definition)
        break
      default:
        if (Array.isArray(definition)) {
          definition.forEach((item) => this.add_(item))
        } else if (definition instanceof Ruler) {
          this.append_(definition)
        } else {
          this.assert(false, 'add', 'bad rule definition < %O >', definition)
        }
    }
    return this
  }

  /** @private */
  append_ (other) {
    const src = other._tree.map(([t, r, p, a]) => [t, r ? r.source : r, p, a])
    const dst = this._tree

    src.forEach(([typ, rul, par, act], i) => {
      const grandPa = par === NIL ? NIL : src[par][PAR]
      let j = dst.findIndex(
        ([t, r, p]) => p === grandPa && t === typ && (r ? r.source : r) === rul)
      if (j < 0) {
        j = dst.push([typ, rule_(rul), grandPa, act]) - 1
      }
      src[i][PAR] = j
    })
    return this
  }

  /** @private */
  addRules_ (rules, type, action) {
    const last = rules.length - 1, tree = this._tree
    let parentIndex = NIL

    rules.forEach((rule, ruleIndex) => {
      const t = ruleIndex < last ? T_DIR : type
      const nodeIndex = tree.findIndex(
        ([typ, rul, par, act]) => {
          const y0 = par === parentIndex && typeMatch_(t, typ)
          const y1 = (rul === GLOB ? rul : rul.source) === rule
          const y2 = ruleIndex < last || (act === action) || act === CONTINUE
          return y0 && y1 && y2
        })

      if (nodeIndex === -1) {
        parentIndex = tree.push([t, rule_(rule), parentIndex, CONTINUE]) - 1
      } else {
        parentIndex = nodeIndex
      }
    })
    this.assert(parentIndex >= 0, 'addRules_', 'no node created')
    tree[parentIndex][ACT] = action
  }

  /**
   * @param {string} path
   * @returns {Ruler}
   * @private
   */
  addPath_ (path) {
    const rules = parse(path, this.options)
    const flags = rules.shift()

    this.assert(rules.length, 'addPath_', 'no rules')
    let action = this.nextRuleAction
    if (flags.isExclusion) action = -action
    this.addRules_(rules, flags.type, action)
    return this
  }

  /**
   * Check the `itemName` against rules, mutating `lastMatch` item property.
   *
   * The results array never contains ROOT node, which will be added
   * on every run.
   * If a node of special action is matched, then only this node is returned.
   *
   * @param {string} itemName of item
   * @param {string=} itemType of item
   * @returns {number} the most prevailing action among matches.
   */
  check (itemName, itemType = T_ANY) {
    const globs = [], tree = this._tree

    const anc = (this.ancestors || [])
      .map(([a, i]) => {
        if (i > ROOT && tree[i][RUL] === GLOB) globs.push([a, i])
        return i
      })

    anc.push(ROOT)    //  Always!

    this.lastMatch = this.match_(itemName, itemType, anc, [], []).concat(globs)

    return Math.max.apply(Math, this.lastMatch.map(([a]) => a))
  }

  /**
   * Create copy of the instance.
   * @param {*=} ancestors array or:
   *   - `true` means use `lastMatch` instance property w fallback to ancestors
   *   - falsy value means use `ancestors` property.
   * @returns {Ruler}
   */
  clone (ancestors = false) {
    let a = ancestors
    const c = new Ruler(this.options)

    if (!Array.isArray(a)) {
      a = (a && this.lastMatch) || this.ancestors || []
    }
    c.ancestors = a.slice()
    c.nextRuleAction = this.nextRuleAction
    c._tree = this._tree.slice()

    return c
  }

  /**
   * Create a new instance with new rules appended.
   *
   * @param {...*} args rule definitions
   * @returns {Ruler}
   */
  concat (...args) {
    const c = this.clone()
    return this.add.apply(c, args)
  }

  /**
   * Create diagnostic dump for visual display.
   * @param {Array<string>|string|number=} options which members to show and how.
   * @returns {string|undefined} NB: always undefined in production mode!
   */
  dump (options = undefined) {
  }

  /**
   * Check if given results array contains entry with given action.
   * @param {Array<Array<number>>} results
   * @param {number} action
   * @returns {boolean}
   */
  static hasActionIn (results, action) {
    return !!(results && results.find(([a]) => a === action))
  }

  /**
   * Check if any of ancestors contains given action.
   * @param {number} action
   * @returns {boolean}
   */
  hadAction (action) {
    return Ruler.hasActionIn(this.ancestors, action)
  }

  /**
   * Check if results from recent match contain given action.
   * @param {number} action
   * @returns {boolean}
   */
  hasAction (action) {
    return Ruler.hasActionIn(this.lastMatch, action)
  }

  /**
   * @param {string} itemName
   * @param {string} itemType
   * @param {Array<number>} ancestors
   * @param {Array} res
   * @param {Array} toDisclaim
   * @returns {Array<Array<number>>}
   * @private
   */
  match_ (itemName, itemType, ancestors, res, toDisclaim) {
    const lowest = -1  //  Todo: think if we can finish looping earlier.
    const tree = this._tree

    // Scan the three for nodes matching any of the ancestors.
    for (let i = tree.length; --i > lowest;) {
      const [type, rule, par, act] = tree[i]

      //  Ancestors list is always smaller than tree ;)
      for (let iA = 0, anc; (anc = ancestors[iA]) !== undefined; iA += 1) {
        if (anc >= i) {   //  Ancestor index is always less than node index.
          ancestors.splice(iA, 1) && (iA -= 1)   //  Discard this ancestor.
          continue
        }
        if (anc !== par) continue

        if (rule !== GLOB &&
          !(typeMatch_(itemType, type) && rule.test(itemName))) {
          continue
        }
        if (rule === GLOB) {
          //  In case of GLOB, check it's descendants immediately.
          this.match_(itemName, itemType, [i], res, toDisclaim)
          if (i === ROOT) continue
        }
        //  We got a real match!
        if (act < 0) {
          toDisclaim.push(-act)
        } else if (!res.find(([, j]) => j === i)) {
          res.push([act, i])
        }
      } //  end for iA
    } //  end for i

    if (toDisclaim.length) {
      res = res.filter(([a]) => toDisclaim.indexOf(a) < 0)
    }
    if (res.length === 0) {
      res.push([CONTINUE, NIL])
    }
    return res
  }

  /**
   * Match the `itemName` against rules. NB: will be deprecated - use `check()`,
   * `hasAction()` and `lastMatch` instead!
   *
   * The results array never contains ROOT node, which will be added
   * on every run.
   * If a node of special action is matched, then only this node is returned.
   *
   * @param {string} itemName of item
   * @param {string=} itemType of item
   * @returns {Array<Array<number>>} array of [action, index]
   */
  match (itemName, itemType = T_ANY) {
    const globs = [], tree = this._tree

    const ancestors = (this.ancestors || [])
      .map(([a, i]) => {
        if (i > ROOT && tree[i][RUL] === GLOB) globs.push([a, i])
        return i
      })

    ancestors.push(ROOT)    //  Always!

    const res = this.match_(itemName, itemType, ancestors, [], []).concat(globs)

    return (this.lastMatch = res.sort(([a], [b]) => b - a))
  }

  /**
   * Get copy of rule tree - for testing only!
   * @type {Array<Array<*>>}
   */
  get treeCopy () {
    return this._tree.slice()
  }
}

module.exports = Ruler

//  These exports may be useful for testing.
Object.assign(Ruler, { CONTINUE, GLOB, NIL, ROOT })
