'use strict'
const { format } = require('util')

module.exports = (...args) => {
  const a = args.slice(0), f = typeof a[0] === 'function' && a.shift()
  const s = format.apply(null, a) + '\n'
  process.stdout.write(f ? f(s) : s)
}
