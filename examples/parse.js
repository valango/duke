#!/usr/bin/env node
'use strict'

const HELP = `Construct and dump a RuleTree as defined by command line.
 Argument containing non-screened commas, will be turned into array.
 Example:
   examples/parse "*.js" 2 /nope`

const RuleTree = require('../src/RuleTree')
const { parseCl, print } = require('./util')

const convert = (str) => {
  const v = Number.parseInt(str)
  return Number.isNaN(v) ? str : v
}

const args = parseCl({}, HELP).args, defs = []

args.forEach((s) => {
  const parts = s.split(/(?<!\\),/)
  defs.push(parts.length > 1 ? parts.map(convert) : convert(s))
})

print('DEFS:\n', defs, '\nTREE:')
const tree = new RuleTree(defs).dump()

tree.forEach((node, i) => print('%s: %O', (i + '').padStart(2), node))
