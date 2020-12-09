#!/usr/bin/env node

//  Walk directories and gather simple statistics.
'use strict'
const chalk = require('chalk')
const { DO_SKIP, dirEntryTypeToLabel, Walker } = require('..')
const { dumpFailures, leaksTrap, parseCl, print } = require('./util')
const relativize = require('../relativize')
const symlinksFinal = require('../symlinksFinal')

const HELP = 'Counts all files and subdirectories under directories given by arguments.'

const counts = {}, { args, options } =
  parseCl({
    symlinks: ['s', 'enable symbolic links'],
    verbose: ['v', 'talk a *lot*']
  }, HELP, true)

const extremes = { deepest: '', maxDepth: 0 }

const addCount = (key) => (counts[key] = ((counts[key] || 0) + 1))

const report = counts =>
  Reflect.ownKeys(counts).map(k =>
    chalk.greenBright(dirEntryTypeToLabel(k)) + ': ' + counts[k]).join(', ')

//  The handlers will be injected into walk context.

const onEntry = function ({ name, type }, context) {
  return addCount(type) && this.onEntry({ name, type }, context)
}

const onFinal = async function (entries, context, action) {
  const { absPath, depth } = context

  if (depth > extremes.maxDepth) {
    (extremes.deepest = absPath) && (extremes.maxDepth = depth)
  }

  //  NB: DO_SKIP or above codes may result from overridden errors!
  return (action < DO_SKIP && this._useSymLinks)
    ? symlinksFinal.call(this, entries, context) : action
}

/** @type {Walker} */
const walker = leaksTrap(new Walker(options))

walker.tick = count => print('Entries processed: ' + count + '\r')

//  Uncomment this, if you _really_ like a lot of mess on your screen.
/* walker.trace = (name, result, closure, args) => {
  if (name !== 'xonEntry' && !/node_modules\/./.test(closure.absPath)) {
    let s = args[0]
    if (s && typeof s === 'object') s = s.name || '*'
    console.log(relativize(closure.absPath), name,
      typeof result === 'number' ? result : '*', s)
  }
} /* */

Promise.all(args.map(dir => walker.walk(dir, { onEntry, onFinal }))).then(res => {
  print('Finished!', res.length, 'walks            ')
}).catch(error => {
  print('Exception! %o', error)
}).finally(() => {
  const t = walker.duration, { dirs, entries, revoked, retries } = walker.stats

  if (walker.halted) print('HALTED:', walker.halted)

  dumpFailures(walker.failures, options.verbose)

  print('Counts by type: ', report(counts))

  print('Total %i ms (%i µs per entry) for %i entries in %i directories.'
    , t / 1000, t / entries, entries, dirs)
  print('\tretries: %i, revoked: %i', retries, revoked)
  print('The deepest (%i) directory was:\n  ', extremes.maxDepth, relativize(extremes.deepest))
})
