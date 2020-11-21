#!/usr/bin/env node
'use strict'
const { Ruler } = require('../src')
const walk = require('./util/walk-ruler')

Ruler.prototype.dump = require('../dumpRuler')
const { parseCl, print } = require('./util')

const HELP = `Construct and dump a rule tree as defined by command line.
   Argument containing non-screened commas, will be turned into array.
   If there is a string after '0', then it will be used as directory path
   for simulated walking and resulting ruler image will be dumped.
   Example:
     examples/parse.js "*.js" 2 /nope "*/**/some" 0 a/b/c/some`

const OPTS = {
  dump: ['d', 'print the rules tree'],
  verbose: ['v', 'print intermediate states of Ruler instance while walking']
}

const printl = process.stdout.write.bind(process.stdout)

const convert = (str) => {
  const v = Number.parseInt(str)
  return Number.isNaN(v) ? str : v
}

const { args, options } = parseCl(OPTS, HELP), defs = []

args.forEach((s) => {
  const parts = s.split(/(?<!\\),/)
  defs.push(parts.length > 1 ? parts.map(convert) : convert(s))
})

const i = defs.indexOf(0), { dump, verbose } = options
const ruler = new Ruler(i < 0 ? defs : defs.slice(0, i))

let lastAction

const trace = (ruler, action, name) => {
  if (verbose) printl(`\t'${name}' -> ${action}\t` + ruler.dump('_lastMatch'))
  lastAction = action
}

if (dump) printl('Initial state:\n' + ruler.dump())

if (i > 0) {
  if (dump && verbose) print()
  walk(ruler, defs[i + 1], trace)
  print('\tresult: ' + lastAction)
} else if (!dump) {
  print('No input and nothing to show - try --help option')
}
