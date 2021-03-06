'use strict'

const print = require('./print')

module.exports = (array, msg = undefined, ...args) => {
  if (!array || array.length === 0) return
  array.forEach((e) => typeof msg === 'function' ? print(msg, e) : print(e))
  if (msg) print.apply(0, [msg].concat(args))
}
