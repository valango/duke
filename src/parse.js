/**
 * @module parse
 */
'use strict'

const ANY = null

const assert = require('assert').strict

exports = module.exports = (string) => {
  const check = (cond) => assert(cond, `invalid pattern '${string}'`)

  // Todo: escaping
  const pattern = string.replace(/\\\s/g, '\\s').trimEnd()
  check(pattern && pattern[0] > ' ')
  const lastIsDir = /\/$/.test(pattern)
  const parts = pattern.split('/'), rules = []
  let inDir = false, wasGlob = false

  if (lastIsDir) parts.pop()
  if (!parts[0]) {
    (inDir = true) && parts.shift()
  }
  if (parts.length > 1) inDir = true
  check(parts.length > 0)

  if (!inDir) rules.push(ANY)

  for (let i = 0, last = parts.length - 1, rule; i <= last; ++i) {
    rule = parts[i]
    if (!wasGlob && rule === '**') {
      wasGlob = rules.push(ANY)
      continue
    }
    rule = rule.replace(/\*+/g, '.*').replace(/\?/g, '.')
    if (i < last || lastIsDir) rule += '/'
    rules.push(rule)
  }
  let l = rules.length - 1
  //  **/*$ --> **$
  if (rules[l] === '.*' && rules[l - 1] === ANY) (rules.pop() && --l)
  //  a/**$ --> a/$
  if (rules[l] === ANY) rules.pop()
  check(!(rules.length === 1 && (rules[0] === ANY || rules[0] === '.*')))
  return rules
}
