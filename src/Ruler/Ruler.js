'use strict'

const { GLOB, NIL, ROOT, DISCLAIM, CONTINUE, DO_SKIP } =
        require('../definitions')
const parse = require('./parse')
const Sincere = require('sincere')
//  Tree node constants.
const RUL = 0
const PAR = 1
const ACT = 2

const rule_ = (r) => r ? new RegExp(r) : r

//  Reducer function used by addPath_ instance method.
const addNode_ = ([parent, tree], rule) => {
  let i = tree.findIndex(
    ([rul, par]) => {
      const y0 = par === parent
      const y1 = (rul === GLOB ? rul : rul.source) === rule
      return y0 && y1
    })
  if (i === -1) {
    i = tree.push([rule_(rule), parent, CONTINUE]) - 1
  }
  return [i, tree]
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
    this._tree = [[GLOB, NIL, CONTINUE]]

    /**
     * Used and mutated by test() method.
     * @type {Array<Array>|undefined}
     */
    this.ancestors = undefined

    /**
     * Action code that will override DISCLAIM value.
     * @type {number}
     */
    this.defaultAction = opts.defaultAction || DISCLAIM

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
    const src = other._tree.map(([r, p, a]) => [r ? r.source : r, p, a])
    const dst = this._tree

    src.forEach(([rul, par, act], i) => {
      const pa = par === NIL ? NIL : src[par][PAR]
      let j = dst.findIndex(
        ([r, p]) => p === pa && (r ? r.source : r) === rul)
      if (j < 0) {
        j = dst.push([rule_(rul), pa, act]) - 1
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
    const rules = parse(path, this.options)
    const flags = rules.shift(), locus = 'addPath_'

    this.assert(rules.length, locus, 'no rules')
    let action = flags.isExclusion ? DISCLAIM : forAction
    if (action === undefined) action = this.nextRuleAction
    this.assert(action > CONTINUE, locus, 'illegal action value \'%i\'', action)

    const i = rules.reduce(addNode_, [NIL, this._tree])[0]

    this.assert(i >= 0, locus, 'no node created')
    const node = this._tree[i]

    node[ACT] = action

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
   * @param {string} string
   * @param {Array<number>} ancestors
   * @returns {Array<Array>}
   * @private
   */
  match_ (string, ancestors) {
    const lowest = -1  //  Todo: think if we can finish looping earlier.
    const tree = this._tree
    let bDisclaim = false, res = []

    // Scan the three for nodes matching any of the ancestors.
    for (let i = tree.length; --i > lowest;) {
      const [rule, par, act] = tree[i]

      //  Ancestors list is always smaller than tree ;)
      for (let iA = 0, anc; (anc = ancestors[iA]) !== undefined; iA += 1) {
        if (anc >= i) {   //  Ancestor index is always less than node index.
          ancestors.splice(iA, 1) && (iA -= 1)   //  Discard this ancestor.
          continue
        }
        if (anc !== par) continue

        if (rule !== GLOB && !rule.test(string)) {
          continue
        }
        if (rule === GLOB) {
          //  In case of GLOB, check it's descendants immediately.
          let next = this.match_(string, [i])
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
   * Match the `string` against rules, without mutating object state.
   *
   * The results array never contains ROOT node, which will be added
   * on every run.
   * If a node of special action is matched, then only this node is returned.
   *
   * @param {string} string to match
   * @returns {Array<Array>} array of [action, index]
   */
  match (string) {
    let ancestors = (this.ancestors || []).slice()
    const globs = [], tree = this._tree

    ancestors = ancestors.length === 0
      ? [NIL]
      : ancestors
        .filter(([, i]) => i !== NIL)
        .map(([a, i]) => {
          if (i > ROOT && tree[i][RUL] === GLOB) globs.push([a, i])
          return i
        })

    const res = this.match_(string, ancestors.slice()).concat(globs)

    return res.sort(([a], [b]) => b - a)
  }

  get treeCopy () {
    return this._tree.slice()
  }
}

module.exports = Ruler
