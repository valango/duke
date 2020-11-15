#!/usr/bin/env node
'use strict'

const HELP = 'Count all files and subdirectories under directories given by arguments.'
const color = require('chalk')
const { readlink } = require('fs').promises
const { Walker } = require('../src')
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

const onEntry = function ({ name, type }, context) {
  // if (type === T_SYMLINK) context.current.push(name)
  add(type)
  return this.onEntry({ name, type }, context)
}

/* const onFinal = (context) => {
  const { data, absPath } = context
  return Promise.all(context.current.map(name => {
    const path = absPath + name
    return readlink(path).then(buff => (data[path] = buff))
  })).then(() => 0)
} */

const tick = (count) => process.stdout.write('Entries processed: ' + count + '\r')

/* const trace = (name, result, closure, args) => {
  if (name === 'onEntry' && !/node_modules\/./.test(closure.absPath)) {
    console.log(closure.absPath, name, result, args[0])
  }
} */

process.on('unhandledRejection', (promise, reason) => {
  console.log('***** Unhandled Rejection at:', promise, 'reason:', reason)
  walker.halt()
})

const walker = new Walker({ symlinks: true })

const opts = { onDir, onEntry, tick }, t0 = start()

Promise.all(args.map(dir => walker.walk(dir, opts))).then(res => {
  console.log('\t\t\nR', res)
}).catch(error => {
  console.log('\t\t\nE', error)
}).finally(() => {
  const t = finish(t0), { dirs, entries, revoked, retries } = walker.getStats()

  if (walker.halted) console.log('HALTED: ', walker.halted)

  dump(walker.failures.slice(0, 60).map(e => e.message), color.redBright,
    'Total %i failures.', walker.failures.length
  )

  for (const k of Object.keys(counts)) {
    print(k + ' :', counts[k])
  }
  print('Total %i ms (%i µs per entry) for %i entries in %i directories.'
    , t / 1000, t / entries, entries, dirs)
  print('\tretries: %i, revoked: %i', retries, revoked)
})
