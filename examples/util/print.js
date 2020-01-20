/**
 * @module example/util/print
 */
'use strict'
const { format } = require('util')

module.exports = (...args) => process.stdout.write(format.apply(null, args) + '\n')
