/**
 * @module parse
 */
'use strict'

const ANY = '.*'
const ANYQ = '^.*$'
const EXCL = '!'
const GLOB = null

const assert = require('assert').strict

/**
 * @param {string} string
 * @returns {string[]}
 */
exports = module.exports = (string) => {
  const check = (cond) => assert(cond, `invalid pattern '${string}'`)
  const rules = []

  let pattern = string.replace(/\\\s/g, '\\s').trimEnd()
  switch (pattern[0]) {
    case '!':
      rules.push(EXCL)
    // fall through
    case '\\':
      pattern = pattern.substring(1)
  }
  check(pattern && pattern[0] > ' ')
  const lastIsDir = /\/$/.test(pattern)
  const parts = pattern.split('/')
  let inDir = false, wasGlob = false

  if (lastIsDir) parts.pop()
  if (!parts[0]) {
    (inDir = true) && parts.shift()
  }
  if (parts.length > 1) inDir = true
  check(parts.length > 0)

  if (!inDir) rules.push(GLOB)

  for (let i = 0, last = parts.length - 1, rule; i <= last; ++i) {
    rule = parts[i]
    if (!wasGlob && rule === '**') {
      wasGlob = rules.push(GLOB)
      continue
    }
    rule = rule.replace(/\*+/g, ANY).replace(/\?/g, '.')
    if (i < last || lastIsDir) rule += '\\/'
    rules.push('^' + rule + '$')
  }
  let l = rules.length - 1
  //  **/*$ --> **$
  if (rules[l] === ANYQ && rules[l - 1] === GLOB) (rules.pop() && --l)
  //  a/**$ --> a/$
  if (rules[l] === GLOB) rules.pop()
  check(!(rules.length === 1 && (rules[0] === GLOB || rules[0] === ANY)))
  return rules
}

Object.assign(exports, { ANY, EXCL, GLOB })
