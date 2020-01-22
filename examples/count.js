/**
 * Count all files and subdirectories, w/o applying any rules.
 */
'use strict'

const HELP = 'Count all files and subdirectories, excluding nothing.'
const color = require('chalk')
const { DirWalker, typename } = require('../src')
const { dump, measure, parseCl, print } = require('./util')

const counts = {}, { args } = parseCl({}, HELP)
let deepest = '', maxDepth = 0, total = 1

const add = (key) => {
  if (!counts[key]) counts[key] = 0
  ++counts[key] && ++total
}

//  Application-specific code.
const onBegin = ({ absDir, depth }) => {
  if (depth <= maxDepth) return
  (deepest = absDir) && (maxDepth = depth)
}
const onEntry = ({ type }) => add(type)

const w = new DirWalker()
const t = measure(
  () => args.forEach((dir) => w.walk(dir, { onBegin, onEntry }))
)

dump(w.failures, color.redBright, 'Total %i failures.', w.failures.length)

print('Results from \'%s\':', args.join('\', \''))

for (const k of Object.keys(counts)) {
  print(typename(k).padStart(16, ' ') + ':', counts[k])
}
print('Total %i ms (%i µs per item), max directory depth: %i.',
  t / 1000, t / total, maxDepth)
print('The deepest directory:\n%s', deepest)
