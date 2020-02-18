#!/usr/bin/env node
'use strict'
const { Ruler, actionName } = require('..')
const run = require('./util/run-ruler')

const MSG = 'Ruler.dump() does not work in production mode'

const HELP = `Construct and dump a rule tree as defined by command line.
   Argument containing non-screened commas, will be turned into array.
   If there is a string after '0', then it will be used as directory path
   for simulated walking and resulting ruler image will be dumped.
   Example:
     examples/parse.js "*.js" 2 /nope "*/**/some" 0 a/b/c/some`

const { parseCl, print } = require('./util')

const convert = (str) => {
  const v = Number.parseInt(str)
  return Number.isNaN(v) ? str : v
}

const defs = []

parseCl({}, HELP).args.forEach((s) => {
  const parts = s.split(/(?<!\\),/)
  defs.push(parts.length > 1 ? parts.map(convert) : convert(s))
})

const i = defs.indexOf(0)

const ruler = i < 0
  ? new Ruler(defs) : run(new Ruler(defs.slice(0, i)), defs[i + 1])

print('ACTION: %s\nRULER:\n%s', actionName(run.action), ruler.dump() || MSG)
