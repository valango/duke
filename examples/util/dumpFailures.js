'use strict'
const R = require('chalk').redBright
const dump = require('./dump')
const print = require('./print')

/**
 * @param {Error[]} failures
 * @param {boolean} verbose
 */
module.exports = (failures, verbose) => {
  if (failures.length) {
    if (verbose) {
      dump(failures.map(e => e.message), R('Total %i soft failures.'), failures.length)
    } else {
      const map = new Map(), codes = []
      for (const e of failures) {
        const key = e.code || 'no-code'
        map.set(key, (map.get(key) || 0) + 1)
      }
      for (const r of map[Symbol.iterator]()) codes.push(R(r[0]) + ':' + r[1])

      print('Error codes encountered: ' + codes.join(' '))
      print(R, 'Total %i soft failures.', failures.length)
      print('Use --verbose option to see details')
    }
  }
}
