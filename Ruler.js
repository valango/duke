/**
 * @module Ruler
 */
'use strict'

// const ME = 'Ruler'

const ANY = null
const defaultAction = 'DEF'

const parse = require('./parse')

class Ruler {
  constructor () {
    //  { <record-index>'@'<level-index>: action }
    this._actions = {}
    //  Array of rules - source or compiled.
    this._rules = []
    //  Inverted tree of back- and rule- indexes
    this._backIndexes = []
    this._ruleIndexes = []
    this._compiled = false
  }

  /**
   *
   * @param {string} mask
   * @param {*} action
   */
  add (mask, action) {
    const parsed = parse(mask), rules = this._rules
    const back = this._backIndexes, ruleIndexes = this._ruleIndexes
    let iNode = -1, level = 0, rule

    while ((rule = parsed[level]) !== undefined) {
      let iRule = rules.indexOf(rule)
      if (iRule < 0) iRule = rules.push(rule) - 1
      if (!ruleIndexes[level]) {
        back.push([]) && ruleIndexes.push()
        back[0] = iNode
        ruleIndexes[iNode = 0] = [iRule]
      }
      iNode = back[level].push(iNode) - 1
      ruleIndexes[level].push(iRule)
      level += 1
    }
    if (iNode < 0) throw new Error('no node')
    this._actions[iNode + '@' + (level - 1)] = action
  }

  //  Do the actual rule matching
  match (name, previous) {
    let rule, backIndex, nodeIndex
    const level = previous ? previous.level + 1 : 0
    const rixs = this._ruleIndexes[level], rules = this._rules

    if (rixs) {
      backIndex = rixs.findIndex((iR, j) => {
        return ((rule = rules[iR]) === ANY || rule.test(name)) &&
          ((nodeIndex = j) || true)
      })
    }
    //  If no rule matches, but the `previous` was ANY, then stick w it.
    if (nodeIndex === undefined) {
      return (previous && previous.rule === ANY) ? previous : false
    }
    return { backIndex, level, nodeIndex, rule }
  }

  begin ({ path }, context) {
    if (!this._compiled) this.compile()
    const l = path.length, res = Object.assign({}, context)
    const r = l ? this.match(path[l - 1] + '/', context.previous)
      : {}
    if (r === false) return false
    res.previous = r
    //  Check actual actions, like exclude
    return res
  }

  visit (type, name, { context }) {
    if (type === 'File') {
      const r = this.match(name, context.previous)
    }
    return true
  }

  compile () {
    if (!this._compiled) {
      for (let rs = this._rules, i = rs.length; --i >= 0;) {
        if (rs[i]) rs[i] = new RegExp(rs[i])
      }
      this._compiled = true
    }
  }
}

exports = module.exports = Ruler
