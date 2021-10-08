'use strict'

const assert = require('assert-fine')
const brexIt = require('brace-expansion')
const { S_TYPES, T_DIR, T_FIFO, T_FILE } = require('../constants')

const anyChar = '.'
const anyType = 0
const doubleStar = '**'
const optionalChars = '.*'
const GLOB_DIRS = null      //  Rule for `doubleStar`.

const { isNaN } = Number

/**
 * Convert `path` parts separated by '/' to array of RegExp instances.
 * Used internally by `Ruler`.
 *
 * @param {string} path with optional type specifier separated by ';'.
 * @param {Object<{extended, optimize}>} options
 * @returns {Array} the first entry is flags object
 */
exports = module.exports = (path, options = undefined) => {
  const check = (cond) => assert(cond, 'invalid rule definition %o', path)
  const opts = { extended: true, optimize: true, ...options }, rules = []

  let pattern = path.replace(/\\\s/g, '\\s').trimEnd()  //  Normalize spaces.
  let isExclusion = false, type = anyType
  let givenType = /^([^;]+);(.?)$/.exec(pattern) || anyType

  if (givenType) {
    pattern = givenType[1]
    const s = givenType[2]
    let v = s * 1

    if (s) {
      if (isNaN(v)) v = S_TYPES.indexOf(s)
      assert(v >= T_FILE && v <= T_FIFO && (v % 1) === 0,
        'bad type in rule definition %o', path)
      givenType = v
    } else {
      givenType = anyType
    }
  }

  if (pattern[0] === '!') {                     //  Exclusion character starting a line.
    (isExclusion = true) && (pattern = pattern.substring(1))
  } else if (pattern.indexOf('\\!') === 0) {    //  Screened exclusion.
    pattern = pattern.substring(1)
  }
  if (opts.extended) {
    //  Detect non-escaped '{'...'}'.
    pattern = pattern.replace(/(?<!\\){[^}]+(?<!\\)}/g,
      (p) => '(' + brexIt(p).join('|') + ')')
  }
  pattern = pattern.replace(/\./g, '\\.')       //  Screen dot characters.
  const parts = pattern.split(/(?<!\\)\//)      //  Matches '/' only if not escaped.

  if (parts[0] !== doubleStar) {
    parts[0] ? parts.unshift(doubleStar) : parts.shift()
  }
  let last = parts.length - 1

  if (last >= 0 && !parts[last]) (type = T_DIR) && (parts.pop() || --last)
  check(last >= 0)

  for (let i = 0; i <= last; ++i) {
    let rule = parts[i], length

    check(rule)

    if (rule === doubleStar) {
      rule = GLOB_DIRS       //  Avoid multiple GLOB_DIRS.
      if ((length = rules.length) > 0 && rules[length - 1] === GLOB_DIRS) rules.pop()
    }
    if (rule !== GLOB_DIRS) {
      rule = rule.replace(/\*+/g, optionalChars).replace(/\?/g, anyChar)

      if (!opts.optimize) {
        rule = '^' + rule + '$'
      } else if (rule === optionalChars || rule === anyChar) {
        rule = anyChar
      } else {
        rule = rule.indexOf(optionalChars) === 0 ? rule.substring(2) : '^' + rule
        rule = /\.\*$/.test(rule) ? rule.substring(0, rule.length - 2) : rule + '$'
      }
    }
    rules.push(rule)
  }

  const any = opts.optimize ? anyChar : '^.*$', l = rules.length - 1
  //  a/**$ --> a/$
  if (rules[l] === null) (type = T_DIR) && rules.pop()
  assert(givenType === anyType || type === anyType || type === givenType,
    'type conflict in rule definition %o', path)
  check(!(rules.length === 1 && (rules[0] === anyChar || rules[0] === any)))
  rules.unshift({ type: type || givenType, isExclusion })
  return rules
}

exports.GLOB_DIRS = GLOB_DIRS
