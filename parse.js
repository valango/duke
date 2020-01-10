/**
 * @module parse
 */
'use strict'

const ANY = null

const assert = require('assert').strict

exports = module.exports = (rule) => {
  // Todo: escaping
  const lastIsDir = /\/$/.test(rule)
  const parts = rule.split('/'), rules = []
  let inDir = false, wasGlob = false

  if (lastIsDir) parts.pop()
  if (!parts[0]) {
    (inDir = true) && parts.shift()
  }
  if (parts.length > 1) inDir = true
  assert(parts.length, `invalid rule '${rule}'`)

  if (!inDir) rules.push(ANY)

  for (let i = 0, last = parts.length - 1, rule; i <= last; ++i) {
    rule = parts[i]
    if (!wasGlob && rule === '**') {
      wasGlob = rules.push(ANY)
      continue
    }
    rule = rule.replace(/\*+/g, '.*').replace(/\?/g, '.')
    if (i < last || lastIsDir) rule += '\\/'
    rules.push(rule)
  }
  return rules
}
