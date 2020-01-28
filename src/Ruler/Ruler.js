'use strict'

const DEPRECATED = 'DeprecationWarning'
const WARNING_1 = 'Ruler.add(definition, action) syntax is deprecated -' +
  ' use `.add(action, {rule}, {action, {rule...}...)`'
const WARNING_2 = "Ruler 'action' option is deprecated - use 'defaultAction'"

const { DO_DEFAULT, DISCLAIM, CONTINUE, GLOB, NIL } = require('../definitions')
const defaults = require('lodash.defaults')
const parse = require('./parse')
const Sincere = require('sincere')
const RUL = 0
const PAR = 1
const ACT = 2
const IDX = 3

const rule_ = (r) => r ? new RegExp(r) : r

//  Reducer function.
const addNode_ = ([parent, tree], rule) => {
  let i = tree.findIndex(
    ([rul, par]) => {
      const y0 = par === parent
      const y1 = (rul === null ? rul : rul.source) === rule
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
    opts = defaults({}, opts)

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
     * Used and mutated by test() method.
     * @type {Array<*>}
     */
    this.ancestors = undefined

    if (opts.action) {
      process.emitWarning(WARNING_2, DEPRECATED)
      if (!opts.defaultAction) opts.defaultAction = opts.action
    }

    /**
     * Action to be bound to new rule - used and possibly mutated by add().
     * @type {number}
     */
    this.defaultAction = opts.defaultAction === undefined
      ? DO_DEFAULT : opts.defaultAction

    /**
     * Options for string parser.
     * @type {Object}
     */
    this.options = opts

    /**
     * Value of ancestors before mutation by test().
     * @type {Array<*>}
     */
    this.saved = undefined

    if (rules) this.add(rules)
  }

  /**
   * Add new rules. If the first item in definitions array is not string,
   * it will be treated as action code, which will prevail over default action.
   *
   * If `definition` is an array, then every numeric member will be interpreted as
   * action code for following rule(s). Array may be nested.
   *
   * @param {...*} args
   * @returns {Ruler}
   */
  add (...args) {
    if (args.length === 2 && typeof args[1] === 'number') {
      process.emitWarning(WARNING_1, DEPRECATED)
      return this.add_(args[0], args[1])  //  v1.0.1 API
    }
    return this.add_(args)
  }

  add_ (definition, action) {
    this._level += 1
    this._lastItem = definition

    switch (typeof definition) {
      case 'number':
        this.defaultAction = definition
        break
      case 'string':
        this.addPath_(definition, action)
        break
      default:
        if (Array.isArray(definition)) {
          definition.forEach((item) => this.add_(item, action))
        } else if (definition instanceof Ruler) {
          this.conc_(definition)
        } else {
          this.assert(false, 'add', 'bad rule definition < %O >', definition)
        }
    }
    return this
  }

  conc_ (other) {
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
    if (action === undefined) action = this.defaultAction
    this.assert(action > CONTINUE, locus, 'illegal action value \'%i\'', action)

    const i = rules.reduce(addNode_, [NIL, this._tree])[0]

    this.assert(i >= 0, locus, 'no node created')
    const node = this._tree[i] // , [par, rul, act] = node

    // if (act !== action) {
    /*
    if (act !== CONTINUE) {  //  For debugger breakpoint.
      this.assert(false, locus, 'action conflict @%i: [%i, %s, %i]',
        index, par, rul, act)
    } */
    node[ACT] = action
    // }
    return this
  }

  /**
   * Create copy of the instance.
   * @returns {Ruler}
   */
  clone () {
    const a = this.ancestors, c = new Ruler(this.options)
    const s = this.saved

    c.ancestors = a && typeof a === 'object' ? a.slice() : a
    c.saved = s && typeof s === 'object' ? s.slice() : s
    c.defaultAction = this.defaultAction
    c._tree = this.dump()

    return c
  }

  concat (...args) {
    const c = this.clone()
    return this.add.apply(c, args)
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
      for (let i = this._tree.length; --i > lowest;) {
        const [rule, par, act] = tree[i]

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
            next = next.filter((o) => o[RUL] !== GLOB)
            if (next.length) {
              res = res.concat(next)
              continue
            }
          }
          //  We got a match!
          if (act === DISCLAIM) return [[rule, par, act, i]]
          res.push([rule, par, act, i])
        } //  end for iA
      } //  end for i

      if (!res.length) {
        const a = ancs.findIndex((i) => tree[i] && tree[i][RUL] === GLOB)
        if (a >= 0) {
          const i = ancs[a]                   //  Here for debugging
          res.push(tree[i].concat(i))
        }
      } else if (res.length > 1) {
        res = res.filter(([r]) => r !== GLOB)
      }
      if (res.length > 1) {
        //  Sort by action values descending.
        //  This may slightly speed uo the next match iteration
        //  Also, test() method currently relies on this.
        res.sort((a, b) => b[ACT] - a[ACT])
      }
    }
    return res
  }

  restore () {
    this.ancestors = this.saved
    return this
  }

  /**
   * Rigid version of match().
   *
   * @param {string} string
   * @param {Array<*>|boolean|=} ancestors - from earlier test().
   * @returns {number | Array<number>}     - [action code, ancestors].
   */
  test (string, ancestors = undefined) {
    if (this._tree.length === 0) return [DISCLAIM]

    const context = ancestors === true ? this.ancestors : ancestors
    const r = this.match(string, context)
    const res = r.length === 0 ? DISCLAIM : r[0][ACT]

    if (ancestors === true) {
      //  New API
      if (res === CONTINUE) {
        this.saved = this.ancestors
        this.ancestors = r
      }
      return res
    }
    //  Soon-to-be-deprecated API
    return [res, res === CONTINUE ? r : ancestors]
  }
}

module.exports = Ruler
