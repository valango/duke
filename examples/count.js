#!/usr/bin/env node

//  Sample walking directories and gathering simple statistics.

/* eslint no-console:0 */
'use strict'
const color = require('chalk')
const { Walker, relativize } = require('../src')
const { dump, finish, parseCl, print, start } = require('./util')

const HELP = `Count all files and subdirectories under directories given by arguments.
Totals are prefixed by:
  d: directory
  f: file
  l: symlink, 
  B: block device
  C: character device
  F: FIFO
  S: socket`

const counts = {}, { args, options } =
  parseCl({ symlinks: ['s', 'enable symbolic links'] }, HELP, true)
const d = { deepest: '', maxDepth: 0 }

//  =======  Start of application-specific code.      =======

const add = (key) => (counts[key] = ((counts[key] || 0) + 1))

//  To avoid subclassing, We inject handlers into walk context.

const onDir = function (context) {
  const { absPath, depth } = context
  if (depth > d.maxDepth) {
    (d.deepest = absPath) && (d.maxDepth = depth)
  }
  return this.onDir(context, [])
}

const onEntry = function ({ name, type }, context) {
  add(type)
  return this.onEntry({ name, type }, context)
}

const walker = new Walker(options)

process.on('unhandledRejection', (promise, reason) => {
  console.log('***** Unhandled Rejection at:', promise, 'reason:', reason)
  console.log('***** If possible, please report this via issue list.')
  walker.halt()
})

walker.tick = count => process.stdout.write('Entries processed: ' + count + '\r')
//  Uncomment this, if you really like a lot of mess on your screen.
/* walker.trace = (name, result, closure, args) => {
  if (name === 'onEntry' && !/node_modules\/./.test(closure.absPath)) {
    console.log(relativize(closure.absPath), name, result, args[0])
  }
} /* */

const t0 = start()

Promise.all(args.map(dir => walker.walk(dir, { onDir, onEntry }))).then(res => {
  console.log('Finished!', res.length, 'threads          ')
}).catch(error => {
  console.log('Exception!', error)
}).finally(() => {
  const t = finish(t0), { dirs, entries, revoked, retries } = walker.getStats()
  const n = walker.failures.length

  if (walker.halted) console.log('HALTED: ', walker.halted)

  if (n) {
    walker.failures.slice(0, 25).forEach(e => print(e.message))
    print(color.redBright, '(%i of total %i failures)', Math.min(n, 25), n)
  }
  for (const k of Object.keys(counts)) print(k + ' :', counts[k])

  print('Total %i ms (%i µs per entry) for %i entries in %i directories.'
    , t / 1000, t / entries, entries, dirs)
  print('\tretries: %i, revoked: %i', retries, revoked)
  print('The deepest (%i) directory was:\n  ', d.maxDepth, relativize(d.deepest))
})
