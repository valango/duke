/**
 * Simple listing of subdirectories.
 */
'use strict'

const { format } = require('util')
const Walker = require('../src/Walker')

const print = (...args) => process.stdout.write(format.apply(null, args) + '\n')

const spaces = '                                              '

const begin = ({ dirId, path }) => {
  const l = path.length, name = path[l - 1] || ''
  if(/^(\.\w+)|(node_modules|reports|examples)$/.test(name)) return Walker.SKIP
  print(spaces.substr(0, l), 'B', dirId, name)
}

const end = ({ dirId, path }) => {
  print(spaces.substr(0, path.length), 'E', dirId)
}

const visit = (type, name, { path }) => {
  if(/^(\.\w+)/.test(name)) return
  print(spaces.substr(0, path.length + 1), type.padEnd(20, ' '), name)
}

const w = new Walker(process.cwd())

w.go({ begin, end, visit })
