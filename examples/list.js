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
    Walker, Ruler, loadFile
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
const relativePath = require('./util/relative-path')
const talk = options.verbose
  ? print.bind(print, color.green) : () => undefined

class ProWalker extends Walker {
  /**
   * @param {string} absDir
   * @param {string} dir
   * @param {Object} locals
   */
  detect ({ absDir, dir, locals }) {
    let v = loadFile(join(absDir, 'package.json'))

    if (v) {
      v = JSON.parse(v.toString())
      const name = v.name || '', funny = !name
      this.data.nameLength = Math.max(name.length, this.data.nameLength)
      talk('PROJECT', absDir, dir)
      locals.current = { absDir, count: 0, funny, name, promo: '' }
      if (locals.master) {
        locals.master = undefined
        locals.current.promo = 'N'
      }
      locals.ruler = projectRules
      locals.ancestors = undefined
    }
  }

  onEntry ({ dir, locals, name, type }) {
    const action = super.onEntry({ dir, locals, name, type })

    switch (action) {
      case DO_COUNT:
        if (type !== T_FILE) break
        talk('  DO_COUNT: %s @', name.padEnd(16), dir || '.')
        locals.current.count += 1
        break
      case DO_PROMOTE:
        if (type !== T_DIR) break
        locals.current.promo = locals.current.promo || 'T'
        return DO_SKIP
    }
    ++this.data.total
    return action
  }
}

const stats = { dirLength: 0, nameLength: 10, total: 0 }
const tick = () => {
  process.stdout.write(stats.total + '\r')
}
const walker = new ProWalker(
  { defaultRules, nested: options.nested, talk, tick }, stats)

let threads = args.length > 1 && !options.single
const task = threads
  ? () => Promise.all(args.map((d) => walker.walk(d)))
  : () => args.map((d) => walker.walkSync(d)) || {}

measure(task).then((r) => {
  const t = r.time
  dump(walker.failures, color.redBright, 'Total %i soft failures.',
    walker.failures.length)

  walker.trees.sort(
    (a, b) => a.name === b.name ? 0 : (a.name > b.name ? 1 : -1))

  walker.trees.forEach((p) => {
    const dir = relativePath(p.absDir, './')
    stats.dirLength = Math.max(dir.length, stats.dirLength)
    const d = ['%s %s %s:', p.name.padEnd(stats.nameLength),
      p.promo || ' ', (p.count + '').padStart(5), dir]
    if (p.count === 0) p.funny = true
    if (p.funny) d.unshift(color.redBright)
    print.apply(undefined, d)
  })
  print('- name '.padEnd(stats.nameLength, '-'),
    '? - cnt:', '- directory '.padEnd(stats.dirLength, '-'))
  print('Total %i projects', walker.trees.length)
  if (r instanceof Error) {
    print(color.redBright, '%s\nArgs:  %O', r.stack, r.args)
  }
  threads = threads ? 'in ' + args.length + ' threads' : ''
  print('Total %i ms (%i µs/item) on %i items',
    t / 1000, t / stats.total, stats.total, threads)
})
