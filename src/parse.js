/**
 * @module parse
 */
'use strict'

const OPTIONAL = '.*'
const EXCL = '!'
const GLOB = null

const DEFAULTS = { extended: true, optimize: true }
const SEPARATOR = /(?<!\\)\//     //  Matches '/' only if not escaped.

const assert = require('assert').strict
const brexIt = require('brace-expansion')
// const {} = require('./constants')
const defaults = require('lodash.defaults')

const rxBraces = /(?<!\\){[^}]+(?<!\\)}/g   //  Detect non-escaped {...}

/**
 * Convert `string` parts separated by '/' to array of RegExp instances.
 *
 * @param {string} string
 * @param {Object=} options
 * @returns {string[]}
 */
exports = module.exports = (string, options = undefined) => {
  const check = (cond) => assert(cond, `invalid pattern '${string}'`)
  const opts = defaults({}, options || {}, exports.DEFAULTS), rules = []

  let pattern = string.replace(/\\\s/g, '\\s').trimEnd()  //  Normalize spaces.

  switch (pattern[0]) {             //  Process pattern negation '!something'.
    case '!':
      rules.push(EXCL)
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
  const lastIsDir = parts[parts.length - 1] === ''  //  Had trailing '/'
  let isDirectory = lastIsDir, wasGlob = false

  if (lastIsDir) parts.pop()
  if (!parts[0]) (isDirectory = true) && parts.shift()  //  Had leading '/'

  if (parts.length > 1) isDirectory = true
  check(parts.length > 0)

  if (!isDirectory) rules.push(GLOB)

  for (let i = 0, last = parts.length - 1, rule; i <= last; ++i) {
    rule = parts[i]
    if (!wasGlob && rule === '**') {
      wasGlob = rules.push(GLOB)
      continue
    }
    rule = rule.replace(/\*+/g, OPTIONAL).replace(/\?/g, '.')
    if (i < last || lastIsDir) rule += '\\/'

    if (!opts.optimize) {
      rule = '^' + rule + '$'
    } else if (rule === OPTIONAL || rule === '.') {
      rule = '.'
    } else {
      rule = rule.indexOf(OPTIONAL) === 0 ? rule.substring(2) : '^' + rule
      rule = /\.\*$/.test(rule)
        ? rule.substring(0, rule.length - 2) : rule + '$'
    }
    rules.push(rule)
  }
  let l = rules.length - 1
  const any = opts.optimize ? '.' : '^.*$'
  //  **/*$ --> **$
  if (rules[l] === any && rules[l - 1] === GLOB) (rules.pop() && --l)
  //  a/**$ --> a/$
  if (rules[l] === GLOB) rules.pop()
  check(!(rules.length === 1 && (rules[0] === GLOB || rules[0] === any)))
  return rules
}

Object.assign(exports, { OPTIONAL, DEFAULTS, EXCL, GLOB })
