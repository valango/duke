/**
 * Simple listing of subdirectories.
 */
'use strict'

const { format } = require('util')
const Walker = require('../Walker')

const print = (...args) => process.stdout.write(format.apply(null, args) + '\n')

const spaces = '                                              '

const begin = ({ dirId, path }) => {
  const l = path.length, name = path[l - 1] || ''
  print(spaces.substr(0, l), 'B', dirId, name)
  return !/^(\.\w+)|(node_modules)$/.test(name)
}

const end = ({ dirId, path }) => {
  print(spaces.substr(0, path.length), 'E', dirId)
}

const visit = (type, name, { path }) => {
  print(spaces.substr(0, path.length + 1), type[0], name)
}

const w = new Walker(process.cwd(), { begin, end, visit })

w.go()

print('---')
