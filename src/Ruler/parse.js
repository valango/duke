/**
 * @module parse
 */
'use strict'

const ANY = '.'
const EXCL = '!'
const SCREENED_EXCL = '\\!'
const P_GLOB = '**'
const OPTIONAL = '.*'

const DEFAULTS = { extended: true, optimize: true }
const SEPARATOR = /(?<!\\)\//     //  Matches '/' only if not escaped.

const assert = require('assert').strict
const brexIt = require('brace-expansion')
const { GLOB, T_ANY, T_DIR } = require('../definitions')

const rxBraces = /(?<!\\){[^}]+(?<!\\)}/g   //  Detect non-escaped {...}

/**
 * Convert `path` parts separated by '/' to array of RegExp instances.
 *
 * @param {string} path with optional type specifier separated by ';'.
 * @param {Object<{extended, optimize}>} options
 * @returns {Array<*>} = the first entry is flags object
 */
exports = module.exports = (path, options = undefined) => {
  const check = (cond) => assert(cond, `invalid pattern '${path}'`)
  const opts = { ...DEFAULTS, ...options }, rules = []

  let pattern = path.replace(/\\\s/g, '\\s').trimEnd()  //  Normalize spaces.
  let isExclusion = false, type = T_ANY
  let declaredT = /^([^;]+);(.*)$/.exec(pattern)   //  null if not declared.

  if (declaredT) (pattern = declaredT[1]) && (declaredT = declaredT[2])

  if (pattern[0] === EXCL) {
    (isExclusion = true) && (pattern = pattern.substring(1))
  } else if (pattern.indexOf(SCREENED_EXCL) === 0) {
    pattern = pattern.substring(1)
  }
  if (opts.extended) {
    pattern = pattern.replace(rxBraces, (p) => '(' + brexIt(p).join('|') + ')')
  }
  pattern = pattern.replace(/\./g, '\\.')   //  Screen dot characters.
  const parts = pattern.split(SEPARATOR)
  if (parts[0] !== P_GLOB) {
    parts[0] ? parts.unshift(P_GLOB) : parts.shift()
  }
  let last = parts.length - 1

  if (last >= 0 && !parts[last]) (type = T_DIR) && (parts.pop() || --last)
  check(last >= 0)

  for (let i = 0; i <= last; ++i) {
    let rule = parts[i]

    check(rule)

    if (rule === P_GLOB) {
      if (rules.length) {
        if ((rule = rules.pop()) !== GLOB && rule !== ANY) {
          rules.push(rule)
        }
      }
      rule = GLOB
    }
    if (rule !== GLOB) {
      rule = rule.replace(/\*+/g, OPTIONAL).replace(/\?/g, ANY)

      if (!opts.optimize) {
        rule = '^' + rule + '$'
      } else if (rule === OPTIONAL || rule === ANY) {
        rule = ANY
      } else {
        rule = rule.indexOf(OPTIONAL) === 0 ? rule.substring(2) : '^' + rule
        rule = /\.\*$/.test(rule)
          ? rule.substring(0, rule.length - 2) : rule + '$'
      }
    }
    rules.push(rule)
  }

  const any = opts.optimize ? ANY : '^.*$', l = rules.length - 1
  //  a/**$ --> a/$
  if (rules[l] === null) (type = T_DIR) && rules.pop()
  check(!(rules.length === 1 && (rules[0] === ANY || rules[0] === any)))
  rules.unshift({ type: declaredT === null ? type : declaredT, isExclusion })
  return rules
}
