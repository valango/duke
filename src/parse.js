'use strict'

/**
 * A special rule matching any or missing sequence of subdirectories.
 * @const {null} OPTIONAL_DIRS
 * @default
 */
const OPTIONAL_DIRS = null

const anyChar = '.'
const optionalChars = '.*'
const doubleStar = '**'

const assert = require('assert').strict
const brexIt = require('brace-expansion')
const { T_ANY, T_DIR } = require('./constants')

/**
 * Convert `path` parts separated by '/' to array of RegExp instances.
 * Used internally by Ruler.
 *
 * @param {string} path with optional type specifier separated by ';'.
 * @param {Object<{extended, optimize}>} options
 * @returns {Array} the first entry is flags object
 */
module.exports = (path, options = undefined) => {
  const check = (cond) => assert(cond, `invalid pattern '${path}'`)
  const opts = { extended: true, optimize: true, ...options }, rules = []

  let pattern = path.replace(/\\\s/g, '\\s').trimEnd()  //  Normalize spaces.
  let isExclusion = false, type = T_ANY
  let declaredT = /^([^;]+);(.*)$/.exec(pattern)   //  null if not declared.

  if (declaredT) (pattern = declaredT[1]) && (declaredT = declaredT[2])

  if (pattern[0] === '^') {                 //  Exclusion character starting a line.
    (isExclusion = true) && (pattern = pattern.substring(1))
  } else if (pattern.indexOf('\\!') === 0) {  //  Screened exclusion.
    pattern = pattern.substring(1)
  }
  if (opts.extended) {
    //  Detect non-escaped '{'...'}'.
    pattern = pattern.replace(/(?<!\\){[^}]+(?<!\\)}/g,
      (p) => '(' + brexIt(p).join('|') + ')')
  }
  pattern = pattern.replace(/\./g, '\\.')   //  Screen dot characters.
  const parts = pattern.split(/(?<!\\)\//)  //  Matches '/' only if not escaped.
  if (parts[0] !== doubleStar) {
    parts[0] ? parts.unshift(doubleStar) : parts.shift()
  }
  let last = parts.length - 1

  if (last >= 0 && !parts[last]) (type = T_DIR) && (parts.pop() || --last)
  check(last >= 0)

  for (let i = 0; i <= last; ++i) {
    let rule = parts[i]

    check(rule)

    if (rule === doubleStar) {
      if (rules.length) {
        if ((rule = rules.pop()) !== OPTIONAL_DIRS) {
          rules.push(rule)
        }
      }
      rule = OPTIONAL_DIRS
    }
    if (rule !== OPTIONAL_DIRS) {
      rule = rule.replace(/\*+/g, optionalChars).replace(/\?/g, anyChar)

      if (!opts.optimize) {
        rule = '^' + rule + '$'
      } else if (rule === optionalChars || rule === anyChar) {
        rule = anyChar
      } else {
        rule = rule.indexOf(optionalChars) === 0 ? rule.substring(2) : '^' + rule
        rule = /\.\*$/.test(rule)
          ? rule.substring(0, rule.length - 2) : rule + '$'
      }
    }
    rules.push(rule)
  }

  const any = opts.optimize ? anyChar : '^.*$', l = rules.length - 1
  //  a/**$ --> a/$
  if (rules[l] === null) (type = T_DIR) && rules.pop()
  check(!(rules.length === 1 && (rules[0] === anyChar || rules[0] === any)))
  rules.unshift({ type: declaredT === null ? type : declaredT, isExclusion })
  return rules
}

module.exports.OPTIONAL_DIRS = OPTIONAL_DIRS
