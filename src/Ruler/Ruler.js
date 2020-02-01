'use strict'

const { GLOB, NIL, ROOT, DISCLAIM, CONTINUE, DO_SKIP, T_ANY, T_DIR } =
        require('../definitions')
const parse = require('./parse')
const Sincere = require('sincere')
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
    this.ancestors = [[DISCLAIM, NIL]]

    /**
     * Action code that will override DISCLAIM value.
     * @type {number}
     */
    this.defaultAction = opts.defaultAction || DISCLAIM

    /**
     * Most recent result returned by match() method - for debugging.
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
  add_ (definition, action) {
    switch (typeof definition) {
      case 'number':
        this.assert(definition !== DISCLAIM, 'add', "reserved value 'DISCLAIM'")
        this.nextRuleAction = definition
        break
      case 'string':
        this.addPath_(definition, action)
        break
      default:
        if (Array.isArray(definition)) {
          definition.forEach((item) => this.add_(item, action))
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

  /**
   * @param {string} path
   * @param {number=} forAction
   * @returns {Ruler}
   * @private
   */
  addPath_ (path, forAction = undefined) {
    const rules = parse(path, this.options), tree = this._tree
    const flags = rules.shift(), last = rules.length - 1, { type } = flags
    const locus = 'addPath_'

    this.assert(rules.length, locus, 'no rules')
    let action = flags.isExclusion ? DISCLAIM : forAction, parentIndex = NIL
    if (action === undefined) action = this.nextRuleAction
    this.assert(action > CONTINUE, locus, 'illegal action value \'%i\'', action)

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
    this.assert(parentIndex >= 0, locus, 'no node created')
    tree[parentIndex][ACT] = action

    return this
  }

  /**
   * Create copy of the instance.
   * @param {Array=} ancestors
   * @returns {Ruler}
   */
  clone (ancestors = undefined) {
    const a = this.ancestors, c = new Ruler(this.options)

    c.ancestors = ancestors ? ancestors.slice() : (a && a.slice())
    c.defaultAction = this.defaultAction
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
   * @param {string} itemName
   * @param {string} itemType
   * @param {Array<number>} ancestors
   * @returns {Array<Array>}
   * @private
   */
  match_ (itemName, itemType, ancestors) {
    const lowest = -1  //  Todo: think if we can finish looping earlier.
    const tree = this._tree
    let bDisclaim = false, res = []

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
          let next = this.match_(itemName, itemType, [i])
          next = next.filter(([, j]) => j === NIL || tree[j][RUL] !== GLOB)
          res = res.concat(next)
          if (i === ROOT) continue
        }
        //  We got a real match!
        if (act === DISCLAIM) {
          bDisclaim = true
        } else {
          res.push([act, i])
        }
      } //  end for iA
    } //  end for i

    if (bDisclaim) {
      res = res.filter(([a]) => a !== DO_SKIP)
    }
    if (res.length === 0) {
      res.push([this.defaultAction || DISCLAIM, NIL])
    }
    return res
  }

  /**
   * Match the `itemName` against rules, without mutating object state.
   *
   * The results array never contains ROOT node, which will be added
   * on every run.
   * If a node of special action is matched, then only this node is returned.
   *
   * @param {string} itemName of item
   * @param {string=} itemType of item
   * @returns {Array<Array>} array of [action, index]
   */
  match (itemName, itemType = T_ANY) {
    const globs = [], tree = this._tree

    const ancestors = (this.ancestors || []).filter(([, i]) => i !== NIL)
      .map(([a, i]) => {
        if (i > ROOT && tree[i][RUL] === GLOB) globs.push([a, i])
        return i
      })

    ancestors.push(ROOT)    //  Always!

    const res = this.match_(itemName, itemType, ancestors).concat(globs)

    return (this.lastMatch = res.sort(([a], [b]) => b - a))
  }

  get treeCopy () {
    return this._tree.slice()
  }
}

module.exports = Ruler
