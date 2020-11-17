#!/usr/bin/env node

//  Sample application scanning for npm javascript projects
//  and computing some simple statistics on them.

/* eslint no-console:0 */
'use strict'

const { inspect } = require('util')
const color = require('chalk')
const { dump, finish, parseCl, print, start } = require('./util')
const { max } = Math

const HELP = `Scan directories for Node.js projects, sorting output by actual project names.
  Counting .js files will ignore those in '/test' or 'vendor' directories or in
  directories containing .html files (like code coverage report).
  Projects containing '/test' directory will be flagged by 'T'.`
const OPTS = { verbose: ['V', 'talk a *lot*'] }

const { DO_NOTHING, DO_ABORT, DO_CHECK, DO_SKIP, Walker, Ruler, relativize } =
        require('../src')

//  Default rules are applied until DO_CHECK action is recognized.
const defaultRules = [DO_SKIP, 'node_modules/', '.*/', DO_CHECK, 'package.json']

//  Project-specific actions and rules
const DO_COUNT_FILE = 1     //  Source files
const DO_COUNT_TEST = 2     //  Tests?
const DO_COUNT_DOCS = 3     //  Markup files except the README.md
const DO_COUNT_SPECIAL = 4  //  Some specials
const CODES = 5             //  Number od stats columns.

const projectRules = [
  [DO_SKIP, 'node_modules/', '.*/', '/reports/', 'vendor/'],
  [DO_ABORT, '*.html'],
  [DO_COUNT_FILE, '*.js'],
  [DO_COUNT_TEST, '/test*/'],
  [DO_COUNT_DOCS, '*.md', '!README*.md'],
  [DO_COUNT_SPECIAL, '/*.yml', '/README*', '/LICENSE']
]

const { args, options } = parseCl(OPTS, HELP, true)   //  Command-line interface.

//  Working data to be shared with all threads / entries.
const data = {}
const walker = new Walker({ data, rules: defaultRules })

let maxName = 0
//  Results formatting helper.
const composeResults = (data) => {
  const res = [], keys = Reflect.ownKeys(data).sort()

  res.push(`Projects detected: ${keys.length}`, '')

  for (const key of keys) {
    const cols = data[key]
    let s = relativize(key).padEnd(maxName + 1)
    s += (cols[DO_COUNT_FILE].length + ' .js').padStart(10)
    s += (cols[DO_COUNT_FILE].length + ' .md').padStart(10)
    s += '  tests: ' + (cols[DO_COUNT_TEST].length ? 'Y' : 'N')
    if (cols[DO_COUNT_SPECIAL].length > 0) {
      s += '  plus: ' + cols[DO_COUNT_SPECIAL].join(' ')
    }
    res.push(s)
  }
  return res
}

walker.tick = count => process.stdout.write('Entries processed: ' + count + '\r')

//  Uncomment this, if you _really_ like a mess on your screen. ;)
/* walker.trace = (name, result, context, args) => {
  console.log(context.absPath, args[0])
} /* */

//  Dynamically injectable onEntry handler.
const onProjectEntry = function (entry, context) {
  const action = this.onEntry(entry, context)   //  Use original handler method.

  if (action > 0 && action < CODES) {
    const { absPath, current } = context, rootLength = current[0].length
    current[action].push(absPath.substring(rootLength) + entry.name)
  }
  return action
}

//  If DO_CHECK was returned by `onEntry` handler, then:
// - set ruler and handlers for current and child directories (dynamic strategy pattern);
// - initiate data for current project and inject it to results data space;
// - re-evaluate existing directory entries according to new rules.
const onFinal = async function (entries, context, recentAction) {
  let action, entry

  if ((action = recentAction) === DO_CHECK) {
    context.ruler = new Ruler(projectRules)
    context.data[context.absPath] = context.current = new Array(CODES)

    maxName = max(relativize(context.current[0] = context.absPath).length, maxName)

    for (let i = CODES; --i > 0;) context.current[i] = []

    for (let i = 0; (entry = entries[i]) !== undefined && action < DO_ABORT; i += 1) {
      action = max(action, onProjectEntry.call(this, entry, context))
    }
    context.onEntry = onProjectEntry
    if (action < DO_SKIP) action = DO_NOTHING   //  Preserve possible system codes.
  }
  return action
}

process.on('unhandledRejection', (promise, reason) => {
  console.log('***** Unhandled Rejection at:', promise, 'reason:', reason)
  console.log('***** If possible, please report this via issue list.')
  walker.halt()
})

const t0 = start()

Promise.all(args.map(dir => walker.walk(dir, { onFinal }))).then(res => {
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
