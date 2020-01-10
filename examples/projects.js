/**
 * Scan for Node.js projects.
 */
'use strict'
const fs = require('fs')
const { join } = require('path')
const { format } = require('util')
const Walker = require('../Walker')

const print = (...args) => process.stdout.write(format.apply(null, args) + '\n')

const results = []

const begin = ({ dirId, dirPath, path, rootPath }, context) => {
  const l = path.length, name = path[l - 1] || ''
  const res = { path: path.join('/'), fileCount: 0, id: dirId }
  let s

  if (/^(\.\w+)|(node_modules)$/.test(name)) return false
  try {
    s = fs.readFileSync(join(rootPath, dirPath, 'package.json')).toString()
    const p = JSON.parse(s)
    return { name: p.name || '?', version: p.version || '?    ', ...res }
  } catch (e) {
    if (e.code === 'ENOENT') return context
    if (e instanceof SyntaxError) {
      return { name, version: '?', error: e.message, ...res }
    }
    throw e
  }
}

const end = ({ context, dirId }, aborted) => {
  if (aborted || !context) return
  if (context.id === dirId) results.push(context)
}

const visit = (type, name, { context }) => {
  //  No context means we have not reached project directory yet.
  if (!context || type !== 'File') return
  if (context.fileCount !== undefined) context.fileCount += 1
}

const w = new Walker(process.argv[2] || process.cwd(), { begin, end, visit })

w.go()

print('Results (%i) from \'%s\':', results.length, w.rootDir)

results.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
  .forEach((k) => {
    print('%s %s\t%s\t(%i files)', k.name.padEnd(30, ' '), k.version, k.path,
      k.fileCount)
    if (k.error) print('  Error:', k.error)
  })

if (w.failures.length) {
  print('Total %i failures:', w.failures.length)
  for (const e of w.failures) {
    print(e.message)
  }
}
