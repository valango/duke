#!/usr/bin/env node
'use strict'

const HELP = 'Count all files and subdirectories under directories given by arguments.'
const color = require('chalk')
const { readlink } = require('fs').promises
const { Walker, T_SYMLINK } = require('../src')
const { dump, finish, parseCl, print, start } = require('./util')

const counts = {}, { args } = parseCl({}, HELP, true)
const d = { deepest: '', maxDepth: 0 }

//  =======  Start of application-specific code.      =======

const add = (key) => (counts[key] = ((counts[key] || 0) + 1))

//  Use plugin pattern to avoid class declaration.
//  In general case, we should call Walker instance method,
//  but do not do it here.

const onDir = function (context) {
  const { absPath, depth } = context
  if (depth > d.maxDepth) {
    (d.deepest = absPath) && (d.maxDepth = depth)
  }
  return this.onDir(context, [])
}

const onEntry = ({ name, type }, context) => {
  if (type === T_SYMLINK) context.current.push(name)
  add(type)
  return 0
}

const onFinal = (context) => {
  const { data, absPath } = context
  return Promise.all(context.current.map(name => {
    const path = absPath + name
    return readlink(path).then(buff => (data[path] = buff))
  })).then(() => 0)
}

const tick = (count) => process.stdout.write('Entries processed: ' + count + '\r')

const walker = new Walker()

const opts = { onDir, onEntry, onFinal, tick }, t0 = start()

Promise.all(args.map(dir => walker.walk(dir, opts))).then(res => {
  console.log('\nR', res)
}).catch(error => {
  console.log('\nE', error.message)
  console.log('HALTED: ', walker.halted)
}).finally(() => {
  const t = finish(t0), directories = 0, { entries } = walker.getTotals()

  dump(walker.failures.map(e => e.message), color.redBright,
    'Total %i failures.', walker.failures.length)

  for (const k of Object.keys(counts)) {
    print(k + ' :', counts[k])
  }
  print('Total %i ms (%i µs per entry) for %i entries in %i directories.'
    , t / 1000, t / entries, entries, directories)
})
