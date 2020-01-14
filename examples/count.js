/**
 * Count all files and subdirectories, w/o ignoring anything.
 */
'use strict'

const { format } = require('util')
const Walker = require('../src/DirWalker')
const { A_SKIP } = Walker

const print = (...args) => process.stdout.write(format.apply(null, args) + '\n')

const rootDir = process.argv[2] || process.cwd()
const counts = {}
let depth = 0, total = 1, w

const add = (key) => {
  if (!counts[key]) counts[key] = 0
  counts[key] += 1
  total += 1
}

const processor = function processor ({ action, type }) {
  if (action !== A_SKIP) {
    add(type)
  }
  if (w.paths.length > depth) {
    depth = w.paths.length
  }
  depth = Math.max(w.paths.length, depth)
  return action
}

w = new Walker(processor)
const t0 = process.hrtime()

w.walk(rootDir)

const t1 = process.hrtime(t0)
const t = t1[0] * 1e9 + t1[1], v = Math.floor(t / total)

print('Results from \'%s\':', w.rootDir)

Object.keys(counts).forEach((k) => print(k.padStart(16, ' ') + ':', counts[k]))

if (w.failures.length) {
  print('Total %i failures:', w.failures.length)
  for (const e of w.failures) {
    print(e)
  }
}

print('Total %i nanoseconds (%i ns per item), maximum directory depth: %i\n',
  t, v, depth)
