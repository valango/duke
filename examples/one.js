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

const begin = ({ dirId, path, entries }) => {
  console.log('B', dirId, path, entries.length)
  for (const entry of entries) {
    if(/^\.\w+$/.test(entry.name)){
      console.log('SKIP', entry.name)
      entry.skip = true
    }
  }
  return true
}

const end = ({ dirId, path }) => {
  console.log('E', dirId, path)
}

const visit = ({ name, path, type }) => {
  console.log(' ', type[0], name, path)
}

const client = { begin, end, visit }

const w = new Walker(process.cwd(), { client })

w.go()

console.log('---')
