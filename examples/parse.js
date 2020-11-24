#!/usr/bin/env node
'use strict'
const { Ruler } = require('../src')
const walk = require('./util/walk-ruler')

Ruler.prototype.dump = require('../dumpRuler')
const { parseCl, print } = require('./util')

const HELP = `Construct and dump a rule tree as defined by command line.
   Screening single quotes may be applied to all definitions together.
   If there is a string after '0', then it will be used as directory path
   for simulated walking and resulting ruler image will be dumped.
   Example:
     ./examples/parse.js -d -v '1 *.js 2 hide/**/*.js 0 a/hide/b/c.js'`

const OPTS = {
  dump: ['d', 'print the rules tree'],
  verbose: ['v', 'print intermediate states of Ruler instance while walking']
}

const printl = process.stdout.write.bind(process.stdout)

//  Prepare the arguments for Ruler#add().
const convert = (str) => Number.isNaN(1 * str) ? str : 1 * str

const { args, options } = parseCl(OPTS, HELP), defs = []

args.forEach((s) => {
  const parts = s.split(/\s/) && /(?<!%)%[cdfijoO]/.test(s)
  parts.forEach(part => defs.push(convert(part)))
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
