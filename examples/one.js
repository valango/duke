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

const Walker = require('../Walker')

const begin = ({path, entries}) => {
  console.log('B', path, entries.length)
  return entries
}

const end = ({path}) => {
  console.log('E', path)
}

const visit = ({ name, path, type }) => {
  console.log(' ', type[0], name, path)
}

const client = { begin, end, visit }

const w = new Walker(process.cwd(), { client })

w.go()

console.log('---')
