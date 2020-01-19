/**
 * Count all files and subdirectories, w/o applying any rules.
 */
'use strict'

const Walker = require('../src/DirWalker')
const { dump, measure, print } = require('./util')
const { A_SKIP, typename } = Walker

const counts = {}, dirs = process.argv.slice(2)
let deepest = '', maxDepth = 0, total = 1

const add = (key) => {
  if (!counts[key]) counts[key] = 0
  ++counts[key] && ++total
}

//  Application-specific code.
const processor = function processor ({ action, depth, dir, rootDir, type }) {
  if (action !== A_SKIP) add(type)
  if (depth > maxDepth) (deepest = rootDir + '/' + dir) && (maxDepth = depth)
  return action
}
if (dirs.length === 0) dirs.push('.')

const w = new Walker({ processor, rules: null })
const t = measure(() => dirs.forEach((dir) => w.walk(dir))) / 1000

dump(w.failures, 'Total %i failures.', w.failures.length)

print('Results from \'%s\':', dirs.join('\', \''))

for (const k of Object.keys(counts)) {
  print(typename(k).padStart(16, ' ') + ':', counts[k])
}
print('Total %i ms (%i µs per item), max directory depth: %i.',
  t / 1000, t / total, maxDepth)
print('The deepest directory:\n%s', deepest)
