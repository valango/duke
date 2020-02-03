#!/usr/bin/env node
'use strict'

const HELP = 'Count all files and subdirectories, excluding nothing.'
const color = require('chalk')
const { Walker, typeName } = require('../src')
const { dump, measure, parseCl, print } = require('./util')

const counts = {}, { args } = parseCl({}, HELP, true)
const d = { deepest: '', maxDepth: 0 }

//  =======  Start of application-specific code.      =======

const add = (key) => (counts[key] = ((counts[key] || 0) + 1))

//  Use plugin strategy to avoid class declaration.
//  In general case, we should call Walker instance method,
//  but do not do it here.

const onBegin = ({ absDir, depth }) => {
  if (depth <= d.maxDepth) return
  (d.deepest = absDir) && (d.maxDepth = depth)
}

const onEntry = ({ type }) => add(type)

const tick = (count) => process.stdout.write('Entries processed: ' + count + '\r')

const walker = new Walker({ onBegin, onEntry, tick })

measure(
  () => args.map((dir) => walker.walkSync(dir)) && {}
).then(({ time }) => {
//  =======  Start of boilerplate code for reporting. =======
  dump(walker.failures, color.redBright,
    'Total %i failures.', walker.failures.length)

  for (const k of Object.keys(counts)) {
    print(typeName(k).padStart(16, ' ') + ':', counts[k])
  }
  const { directories, entries } = Walker.getTotals()
  print('Total %i ms (%i µs per entry) for %i entries in %i directories.'
    , time / 1000, time / entries, entries, directories)
  print('Max directory depth: %i, the deepest directory was:\n', d.maxDepth, d.deepest)
})
