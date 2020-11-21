/* eslint no-console:0 */
'use strict'
const color = require('chalk')

let leaks = 0

/**
 * Watch for unhandled rejections, apply an ultimate authority if necessary.
 * @param {Walker} walker
 * @returns {Walker}
 */
module.exports = walker => {
  process.on('unhandledRejection', (promise, reason) => {
    console.log('***** Unhandled Rejection at:', promise, 'reason:', reason)
    console.log(color.redBright('***** If possible, please report this via issue list.'))
    if (walker) walker.halt()
    if (++leaks > 2) process.exit(1)
  })
  return walker
}
