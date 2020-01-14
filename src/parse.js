/**
 * @module parse
 */
'use strict'

const ANY = '.'
const EXCL = 0
const GLOB = '**'
const OPTIONAL = '.*'

const DEFAULTS = { extended: true, optimize: true }
const SEPARATOR = /(?<!\\)\//     //  Matches '/' only if not escaped.

const assert = require('assert').strict
const brexIt = require('brace-expansion')
const { T_ANY, T_DIR } = require('./definitions')
const defaults = require('lodash.defaults')

const rxBraces = /(?<!\\){[^}]+(?<!\\)}/g   //  Detect non-escaped {...}

/**
 * Convert `string` parts separated by '/' to array of RegExp instances.
 *
 * @param {string} string
 * @param {Object=} options
 * @returns {[string, string][]}
 */
exports = module.exports = (string, options = undefined) => {
  const check = (cond) => assert(cond, `invalid pattern '${string}'`)
  const opts = defaults({}, options || {}, exports.DEFAULTS)

  let pattern = string.replace(/\\\s/g, '\\s').trimEnd()  //  Normalize spaces.
  let isExlusion = false, rules = []

  switch (pattern[0]) {             //  Process pattern negation '!something'.
    case '!':
      isExlusion = true
    // fall through
    case '\\':
      pattern = pattern.substring(1)
  }

  check(pattern && pattern[0] > ' ')
  if (opts.extended) {
    pattern = pattern.replace(rxBraces, (p) => '(' + brexIt(p).join('|') + ')')
  }
  pattern = pattern.replace(/\./g, '\\.')   //  Screen dot characters.
  const parts = pattern.split(SEPARATOR)
  let lastIsDir = parts[parts.length - 1] === ''  //  Had trailing '/'
  let isDirectory = lastIsDir, wasGlob = false

  if (lastIsDir) parts.pop()
  if (!parts[0]) (isDirectory = true) && parts.shift()  //  Had leading '/'
  const last = parts.length - 1

  check(last >= 0)
  if (last > 0) isDirectory = true
  // if (isDirectory && last === 0) lastIsDir = true

  if (!isDirectory) rules.push([ANY, T_DIR])

  for (let i = 0, last = parts.length - 1; i <= last; ++i) {
    let rule = parts[i], type = i < last || lastIsDir ? T_DIR : T_ANY

    if (!wasGlob && rule === GLOB) {
      wasGlob = rules.push([GLOB, type])
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
    rules.push([rule, type])
  }
  let l = rules.length - 1
  const any = opts.optimize ? ANY : '^.*$'
  //  **/*$ --> **$
  if (rules[l][0] === any && rules[l - 1][0] === GLOB) (rules.pop() && --l)
  //  a/**$ --> a/$
  if (rules[l][0] === GLOB) rules.pop()
  check(!(rules.length === 1 && (rules[0][0] === ANY || rules[0][0] === any)))
  rules= rules.map(([r, t]) => [r === GLOB ? ANY : r, t])
  if(isExlusion) rules.unshift(EXCL)
  return rules
}

Object.assign(exports, { ANY, DEFAULTS, EXCL })
