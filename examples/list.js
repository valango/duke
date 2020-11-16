#!/usr/bin/env node
'use strict'
/* eslint no-console:0 */

const HELP = `Scan directories for Node.js projects, sorting output by actual project names.
  Counting .js files will ignore those in '/test' or 'vendor' directories or in
  directories containing .html files (like code coverage report).
  Projects containing '/test' directory will be flagged by 'T'.`
const OPTS = {
  verbose: ['V', 'talk a *lot*']
}

const { inspect } = require('util')

const { DO_NOTHING, DO_ABORT, DO_CHECK, DO_SKIP, Walker, Ruler, relativize } =
        require('../src')

const DO_COUNT_FILE = 1    //  Add file to count.
const DO_COUNT_TEST = 2
const DO_COUNT_DOCS = 3
const DO_COUNT_SPECIAL = 4
const CODES = 5

Ruler.hook(() => {
  return undefined    //  Breakpoint place.
})

const defaultRules = [DO_SKIP, 'node_modules/', '.*/', DO_CHECK, 'package.json']

const projectRules = [
  [DO_SKIP, 'node_modules/', '.*/', '/reports/', 'vendor/'],
  [DO_ABORT, '*.html'],
  [DO_COUNT_FILE, '*.js'],
  [DO_COUNT_TEST, '/test*/'],
  [DO_COUNT_DOCS, '*.md', '!README*.md'],
  [DO_COUNT_SPECIAL, '/*.yml', '/README*', '/LICENSE']
]

const color = require('chalk')
const { dump, finish, parseCl, print, start } = require('./util')
const { args, options } = parseCl(OPTS, HELP, true)

//  Working data to be shared with all threads / entries.
const data = {}
const opts = { data, rules: defaultRules }
const walker = new Walker(opts)

const composeResults = (data) => {
  const res = [], keys = Reflect.ownKeys(data).sort()

  res.push(`Projects detected: ${keys.length}`, '')

  for (const key of keys) {
    const cols = data[key]
    let s = (cols[DO_COUNT_FILE].length + ' *.js files, ').padStart(18)
    s += (cols[DO_COUNT_FILE].length + ' generic .md files').padStart(21)
    s += ', tests: ' + (cols[DO_COUNT_TEST].length ? 'Y' : 'N')
    if (cols[DO_COUNT_SPECIAL].length > 0) {
      s += ', has: ' + cols[DO_COUNT_SPECIAL].join(' ')
    }
    res.push(relativize(key) + '\n    ' + s)
  }
  return res
}

walker.tick = count => process.stdout.write('Entries processed: ' + count + '\r')

//  Uncomment this, if you really like a lot of mess on your screen.
// walker.trace = (name, result, context, args) => {
//   console.log(context.absPath, args[0])
// }

//  To be injected dynamically.
const onProjectEntry = function (entry, context) {
  const action = this.onEntry(entry, context)

  if (action > 0 && action < CODES) {
    const { absPath, current } = context, rootLength = current[0].length
    current[action].push(absPath.substring(rootLength) + entry.name)
  }
  return action
}

const onFinal = function (entries, context, action) {
  let entry, res = DO_NOTHING

  if (action === DO_CHECK) {
    //  Here we modify the rules and initiate the statistics.
    context.ruler = new Ruler(projectRules)
    //  `context.current` will be forwarded to all subdirectories.
    this.visited.set(context.absPath, context.current = new Array(CODES))

    for (let i = CODES; --i > 0;) context.current[i] = []
    context.current[0] = context.absPath  //  #0 item holds project root.

    for (let i = 0; (entry = entries[i]) !== undefined && res < DO_ABORT; i += 1) {
      res = Math.max(res, onProjectEntry.call(this, entry, context))
    }
    //  Add our stuff to returned data.
    context.data[context.absPath] = context.current

    context.onEntry = onProjectEntry    //  Apply the dynamic strategy pattern.
    res = DO_NOTHING
  }
  return Promise.resolve(res)
}

process.on('unhandledRejection', (promise, reason) => {
  console.log('***** Unhandled Rejection at:', promise, 'reason:', reason)
  walker.halt()
})

const handlers = { onFinal }
const t0 = start()

Promise.all(args.map(dir => walker.walk(dir, handlers))).then(res => {
  print('******* DONE *******      ')
  if (options.verbose) print(inspect(res, { depth: 10 }))
  print(composeResults(data).join('\n'))
}).catch(error => {
  print('****** FAILED ******      ', error)
  if (options.verbose) print('Halted at:\n', inspect(walker.halted, { depth: 10 }))
}).finally(() => {
  const time = finish(t0)

  if (walker.failures.length) {
    if (options.verbose) {
      dump(walker.failures.map(e => e.message), color.redBright,
        'Total %i soft failures.', walker.failures.length
      )
    } else {
      print(color.redBright, 'Total %i soft failures.', walker.failures.length)
      print('Use --verbose option to see details')
    }
  }

  const { dirs, entries } = walker.getStats()
  print('Total %i ms (%i µs per entry) for %i entries in %i directories%s.',
    time / 1000, time / entries, entries, dirs)
})
