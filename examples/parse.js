#!/usr/bin/env node
'use strict'
const MESSAGE = 'Ruler.dump() does not work in production mode'

const HELP = `Construct and dump a rule tree as defined by command line.
 Argument containing non-screened commas, will be turned into array.
 Example:
   examples/parse "*.js" 2 /nope`

const {Ruler} = require('..')
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

print('DEFS: %O\nRULER:\n%s', defs, new Ruler(defs).dump() || MESSAGE)
