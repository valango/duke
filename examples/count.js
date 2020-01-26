#!/usr/bin/env node
'use strict'

const HELP = 'Count all files and subdirectories, excluding nothing.'
const color = require('chalk')
const { Walker, typeName } = require('../src')
const { dump, measure, parseCl, print } = require('./util')

const counts = {}, { args } = parseCl({}, HELP, true)
const d = { deepest: '', maxDepth: 0, total: 1 }

//  =======  Start of application-specific code.

const add = (key) => {
  if (!counts[key]) counts[key] = 0
  ++counts[key] && ++d.total
}

const onBegin = ({ absDir, depth }) => {
  if (depth <= d.maxDepth) return
  (d.deepest = absDir) && (d.maxDepth = depth)
}
const onEntry = ({ type }) => add(type)

const walker = new Walker({ onBegin, onEntry })

measure(
  () => args.forEach((dir) => walker.walk(dir), d)
).then((t) => {
//  =======  Start of boilerplate code for reporting.
  dump(walker.failures, color.redBright,
    'Total %i failures.', walker.failures.length)

  for (const k of Object.keys(counts)) {
    print(typeName(k).padStart(16, ' ') + ':', counts[k])
  }
  print('Total %i ms (%i µs per item), max directory depth: %i.',
    t / 1000, t / d.total, d.maxDepth)
  print('The deepest directory:\n%s', d.deepest)
})
