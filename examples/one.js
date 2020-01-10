/**
 * one.js
 *
 * $
 *
 * Created: 09/01/2020
 * @author Villem Alango <villem.alango@gmail.com>
 * @license http://opensource.org/licenses/MIT
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

const visit = ({ name, path, type }) => {
  print(spaces.substr(0, path.length + 1), type[0], name)
}

const client = { begin, end, visit }

const w = new Walker(process.cwd(), { client })

w.go()

print('---')
