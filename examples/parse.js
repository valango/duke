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

const OPTS = {
  verbose: ['v', 'dump intermediate states of Ruler instance']
}

const convert = (str) => {
  const v = Number.parseInt(str)
  return Number.isNaN(v) ? str : v
}

const dump = (ruler, action, name) => {
  print("'%s' -> %s", name, actionName(action))
  print(ruler.dump() || MSG)
}

const { parseCl, print } = require('./util')
const { args, options } = parseCl(OPTS, HELP), defs = []

args.forEach((s) => {
  const parts = s.split(/(?<!\\),/)
  defs.push(parts.length > 1 ? parts.map(convert) : convert(s))
})

const i = defs.indexOf(0)
let r

if (i < 0) {
  print('Ruler:\n%s', new Ruler(defs).dump() || MSG)
} else {
  r = run(new Ruler(defs.slice(0, i)), defs[i + 1], options.verbose && dump)
  dump(r, run.action, defs[i + 1])
}
