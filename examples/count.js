/**
 * Count all files and subdirectories.
 */
'use strict'

const { format } = require('util')
const Walker = require('../Walker')

const print = (...args) => process.stdout.write(format.apply(null, args) + '\n')

const rootDir = process.argv[2] || process.cwd()

const counts = {}
let depth = 0, total = 1

const add = (key) => {
  if (!counts[key]) counts[key] = 0
  counts[key] += 1
  total += 1
}

const begin = ({ path }) => {
  depth = Math.max(depth, path.length)
  return {}
}

const visit = (type) => {
  add(type)
  return true
}

const w = new Walker(rootDir, { begin, visit })
const t0 = process.hrtime()

w.go()

const t1 = process.hrtime(t0)
const t = t1[0] * 1e9 + t1[1], v = Math.floor(t / total)

print('Results from \'%s\':', w.rootDir)

Object.keys(counts).forEach((k) => print(k.padStart(16, ' ') + ':', counts[k]))

if (w.failures.length) {
  print('Total %i failures:', w.failures.length)
  for (const e of w.failures) {
    print(e.message)
  }
}

print('Total %i nanoseconds (%i ns per item), maximum directory depth: %i\n',
  t, v, depth)
