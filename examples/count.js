#!/usr/bin/env node

//  Sample walking directories and gathering simple statistics.

/* eslint no-console:0 */
'use strict'
const chalk = require('chalk')
const { dirEntryTypeToLabel, Walker } = require('..')
const { dumpFailures, leaksTrap, parseCl, print } = require('./util')
const relativize = require('../relativize')
const symlinksFinal = require('../symlinksFinal')

const HELP = 'Counts all files and subdirectories under directories given by arguments.'

const counts = {}, { args, options } =
  parseCl({
    symlinks: ['s', 'enable symbolic links'],
    verbose: ['v', 'talk a *lot*']
  }, HELP, true)
const d = { deepest: '', maxDepth: 0 }

const add = (key) => (counts[key] = ((counts[key] || 0) + 1))

const report = counts =>
  Reflect.ownKeys(counts).map(k =>
    chalk.greenBright(dirEntryTypeToLabel(k)) + ': ' + counts[k]).join(', ')

//  The handlers will be injected into walk context.

const onDir = async function (context) {
  const { absPath, depth } = context
  if (depth > d.maxDepth) {
    (d.deepest = absPath) && (d.maxDepth = depth)
  }
  return this.onDir(context, [])
}

const onEntry = function ({ name, type }, context) {
  return add(type) && this.onEntry({ name, type }, context)
}

const onFinal = function (entries, context) {
  return this._useSymLinks
    ? symlinksFinal.call(this, entries, context) : Promise.resolve(0)
}

/** @type {Walker} */
const walker = leaksTrap(new Walker(options))

walker.tick = count => process.stdout.write('Entries processed: ' + count + '\r')

//  Uncomment this, if you really like a lot of mess on your screen.
/* walker.trace = (name, result, closure, args) => {
  if (name !== 'xonEntry' && !/node_modules\/./.test(closure.absPath)) {
    let s = args[0]
    if (s && typeof s === 'object') s = s.name || '*'
    console.log(relativize(closure.absPath), name,
      typeof result === 'number' ? result : '*', s)
  }
} /* */

const opts = { onDir, onEntry, onFinal }

Promise.all(args.map(dir => walker.walk(dir, opts))).then(res => {
  console.log('Finished!', res.length, 'walks            ')
}).catch(error => {
  console.log('Exception!', error)
}).finally(() => {
  const t = walker.duration, { dirs, entries, revoked, retries } = walker.stats

  if (walker.halted) console.log('HALTED: ', walker.halted)

  dumpFailures(walker.failures, options.verbose)

  print('Counts by type: ', report(counts))

  print('Total %i ms (%i µs per entry) for %i entries in %i directories.'
    , t / 1000, t / entries, entries, dirs)
  print('\tretries: %i, revoked: %i', retries, revoked)
  print('The deepest (%i) directory was:\n  ', d.maxDepth, relativize(d.deepest))
})
