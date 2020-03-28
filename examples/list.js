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

Ruler.hook(() => {
  return undefined    //  Breakpoint place.
})

const defaultRules = new Ruler([DO_SKIP, 'node_modules', '.*'])
const projectRules = new Ruler([
  [DO_SKIP, 'node_modules', '.*'],
  [DO_ABORT, '*.html'],
  [DO_COUNT, '*.js'],
  [DO_PROMOTE, '/test/'],
  [DO_SKIP, 'vendor/']
])

const color = require('chalk')
const { join } = require('path')
const { dump, measure, parseCl, print } = require('./util')
const { args, options } = parseCl(OPTS, HELP, true)

const trace = options.verbose && ((w, c, a) => {
  if (typeof c === 'object') {
    print(w, c.absDir, c.dir || '', c.name || '', a)
  } else {
    print(w, c)     //  Happens with opendir() only.
  }
})

class ProWalker extends Walker {
  /**
   * @param {Object} context
   */
  detect (context) {
    const { absDir, current, data } = context
    let v = loadFile(join(absDir, 'package.json'))

    if (v) {
      v = JSON.parse(v.toString())
      const name = v.name || '', funny = !name
      data.nameLength = Math.max(name.length, data.nameLength)
      context.ruler = projectRules
      context.current = { absDir, count: 0, funny, name, promo: '' }
      this.trees.push(context.current)
      if (current) {
        context.current.promo = 'N'
      }
      return 1
    }
    return 0
  }

  onEntry (context) {
    const action = super.onEntry(context)
    const { current, type } = context

    if (current) {
      this.assert(context.absDir.indexOf(current.absDir) === 0, 'ABS',
        '\nA=%s\nC=%s', context.absDir, current.absDir)
    }
    switch (action) {
      case DO_COUNT:
        if (type !== T_FILE) break
        current.count += 1
        break
      case DO_PROMOTE:
        if (type !== T_DIR) break
        current.promo = current.promo || 'T'
        return DO_SKIP
    }
    return action
  }
}

//  Working data to be shared with all threads / entries.
const data = { dirLength: 0, nameLength: 10, total: 0 }
const tick = (count) => process.stdout.write(
  'Entries processed: ' + count + '\r')
const opts = { data, defaultRules, nested: options.nested, tick, trace }
const walker = new ProWalker(opts)

const threads = args.length > 1 && !options.single
const task = threads
  ? () => Promise.all(args.map((d) => walker.walk(d)))
  : () => Promise.resolve(args.map((d) => walker.walkSync(d)))

measure(task).then((results) => {
  const time = results.time

  dump(walker.failures, color.redBright, 'Total %i soft failures.',
    walker.failures.length)

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

  const { directories, entries } = Walker.getTotals()
  print('Total %i ms (%i µs per entry) for %i entries in %i directories%s.',
    time / 1000, time / entries, entries, directories,
    threads ? ' processed by ' + args.length + ' threads' : '')
})
