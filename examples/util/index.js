/**
 * @module examples/util/index
 */
'use strict'

const { format } = require('util')

const print = (...args) => process.stdout.write(format.apply(null, args) + '\n')

const dump = (array, msg = undefined, ...args) => {
  if (!array || array.length === 0) return
  array.forEach((e) => print(e))
  if (msg) print.apply(0, [msg].concat(args))
}

module.exports = {
  dump,
  measure: require('./measure'),
  print
}
