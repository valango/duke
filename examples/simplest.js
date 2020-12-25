#!/usr/bin/env node
'use strict'
//  Walks the upper directory gathering rudimentary statistics.

const walker = new (require('..')).Walker()
const print = require('./util/print')

walker.walk('..').then(res => {
  print('Finished!')
}).catch(error => {
  print('Exception!', error)
}).finally(() => {
  print('%O', walker.stats)
  print('Elapsed: %i ms', walker.duration / 1000)
})
