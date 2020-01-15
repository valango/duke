/**
 * @module parse
 */
'use strict'

const ANY = '.'
const EXCL = '!'
const HAS_DIRS = 'd'
const ALL_DIRS = 'D'
const SCREENED_EXCL = '\\!'
const GLOB = '**'
const OPTIONAL = '.*'

const DEFAULTS = { extended: true, optimize: true }
const SEPARATOR = /(?<!\\)\//     //  Matches '/' only if not escaped.

const assert = require('assert').strict
const brexIt = require('brace-expansion')
const defaults = require('lodash.defaults')

const rxBraces = /(?<!\\){[^}]+(?<!\\)}/g   //  Detect non-escaped {...}

/**
 * Convert `string` parts separated by '/' to array of RegExp instances.
 *
 * @param {string} string
 * @param {Object=} options
 * @returns {string[]} = the first string is flags
 */
exports = module.exports = (string, options = undefined) => {
  const check = (cond) => assert(cond, `invalid pattern '${string}'`)
  const opts = defaults({}, options || {}, exports.DEFAULTS)

  let pattern = string.replace(/\\\s/g, '\\s').trimEnd()  //  Normalize spaces.
  let fX = '', fD = '', fA = ''

  if (pattern[0] === EXCL) {
    (fX = EXCL) && (pattern = pattern.substring(1))
  } else if (pattern.indexOf(SCREENED_EXCL) === 0) {
    pattern = pattern.substring(1)
  }
  if (opts.extended) {
    pattern = pattern.replace(rxBraces, (p) => '(' + brexIt(p).join('|') + ')')
  }
  pattern = pattern.replace(/\./g, '\\.')   //  Screen dot characters.
  const parts = pattern.split(SEPARATOR)
  if (!parts[0]) (fD = HAS_DIRS) && parts.shift()
  let last = parts.length - 1, rules = [], wasGlob = false

  if (last >= 0 && !parts[last]) (fA = ALL_DIRS) && (parts.pop() || --last)
  check(last >= 0)
  if (last > 0) {
    fD = HAS_DIRS
  } else if (fD) fA = ALL_DIRS
  // if (fA) fD = HAS_DIRS

  for (let i = 0; i <= last; ++i) {
    let rule = parts[i]

    check(rule)

    if (!wasGlob && rule === GLOB) {
      wasGlob = rules.push(GLOB)
      continue
    }
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
    rules.push(rule)
  }
  let l = rules.length - 1
  const any = opts.optimize ? ANY : '^.*$'
  //  **/*$ --> **$
  if (rules[l] === any && rules[l - 1] === GLOB) (rules.pop() && --l)
  //  a/**$ --> a/$
  if (rules[l] === GLOB) rules.pop() && (fA = ALL_DIRS)
  check(!(rules.length === 1 && (rules[0] === ANY || rules[0] === any)))
  rules = rules.map((r) => r === GLOB ? ANY : r)
  rules.unshift(fX + fA + fD)
  return rules
}

Object.assign(exports, { ANY, DEFAULTS, HAS_DIRS, ALL_DIRS, EXCL })
