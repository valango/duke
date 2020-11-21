'use strict'

const walker = new (require('.')).Walker()
const print = require('./util/print')
const dirs = '/dev ..'.split(' ')

Promise.all(dirs.map(dir => walker.walk(dir))).then(res => {
  print('Finished!', res.length)
}).catch(error => {
  print('Exception!', error)
}).finally(() => {
  print('%O', walker.stats)
  print('Elapsed: %i ms', walker.duration / 1000)
})
