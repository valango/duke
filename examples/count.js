/**
 * Count all files and subdirectories.
 */
'use strict'

const { format } = require('util')
const Walker = require('../Walker')

const print = (...args) => process.stdout.write(format.apply(null, args) + '\n')

const rootDir = process.argv[2] || process.cwd()

let nD = 0, nF = 0, depth = 0

const begin = ({ dirId, path, entries }) => {
  nD += 1     // = dirId + 1
  depth = Math.max(depth, path.length)
  return true
}

const visit = ({ name, path, type }) => {
  if (type === 'File') nF += 1
}

const w = new Walker(rootDir, { client: { begin, visit } })
const t0 = process.hrtime()

w.go()

const t1 = process.hrtime(t0)
const t = t1[0] * 1e9 + t1[1], v = Math.floor(t / (nD + nF))

print('%i files in %i directories with maximum depth of', nF, nD, depth)
print('Total %i nanoseconds (%i ns per item)', t, v)
if (w.failures.length) {
  print('Total %i failures:', w.failures.length)
  for (const e of w.failures) {
    print(e.message)
  }
}
