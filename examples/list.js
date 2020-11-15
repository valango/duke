#!/usr/bin/env node
'use strict'

const HELP = `Scan directories for Node.js projects, sorting output by actual project names.
  Counting .js files will ignore those in '/test' or 'vendor' directories or in
  directories containing .html files (like code coverage report).
  Projects containing '/test' directory will be flagged by 'T'.`
const OPTS = {
  nested: ['n', 'allow nested projects'],
  single: ['s', 'do not use multi-threading'],
  verbose: ['V', 'talk a *lot*']
}

const
  {
    DO_ABORT, DO_SKIP, T_FILE, T_DIR,
    Walker, Ruler, loadFile, relativize
  } = require('../src')

const DO_COUNT = 1    //  Add file to count.
const DO_PROMOTE = 2  //  Found test support.
const DO_CHECK = 3    //  Check if current dir is a project root.

Ruler.hook(() => {
  return undefined    //  Breakpoint place.
})

const defaultRules = [DO_SKIP, 'node_modules/', '.*/', DO_CHECK, 'package.json']

/* const projectRules = new Ruler([
  [DO_SKIP, 'node_modules', '.*'],
  [DO_ABORT, '*.html'],
  [DO_COUNT, '*.js'],
  [DO_PROMOTE, '/test/'],
  [DO_SKIP, 'vendor/']
]) */

const color = require('chalk')
const { join } = require('path')
const { dump, finish, measure, parseCl, print, start } = require('./util')
const { args, options } = parseCl(OPTS, HELP, true)

//  Working data to be shared with all threads / entries.
const data = { dirLength: 0, nameLength: 10, total: 0 }
const opts = { data, rules: defaultRules }
const walker = new Walker(opts)

walker.tick = count => process.stdout.write('Entries processed: ' + count + '\r')

walker.trace = (name, result, context, args)=>{
  if(name !== 'onEntry' || context.depth > 0) return
  console.log(context.absPath, result, args[0])
}

process.on('unhandledRejection', (promise, reason) => {
  console.log('***** Unhandled Rejection at:', promise, 'reason:', reason)
  walker.halt()
})

const t0 = start()

Promise.all(args.map(dir => walker.walk(dir))).then(res => {
  console.log('******* DONE *******      \n', res)
}).catch(error => {
  console.log('****** FAILED ******      \n', error)
}).finally(() => {
  const time = finish(t0)

  dump(walker.failures, color.redBright, 'Total %i soft failures.',
    walker.failures.length)
  /*
    walker.trees.sort(
      (a, b) => a.name === b.name ? 0 : (a.name > b.name ? 1 : -1))

    walker.trees.forEach((p) => {
      const dir = relativize(p.absDir, '~')
      data.dirLength = Math.max(dir.length, data.dirLength)
      const d = ['%s %s %s:', p.name.padEnd(data.nameLength),
        p.promo || ' ', (p.count + '').padStart(5), dir]
      if (p.count === 0) p.funny = true
      if (p.funny) d.unshift(color.redBright)
      print.apply(undefined, d)
    })
    print('- name '.padEnd(data.nameLength, '-'),
      '? - cnt:', '- directory '.padEnd(data.dirLength, '-'))
    print('Total %i projects', walker.trees.length)
  */
  const { dirs, entries } = walker.getStats()
  print('Total %i ms (%i µs per entry) for %i entries in %i directories%s.',
    time / 1000, time / entries, entries, dirs)
})
