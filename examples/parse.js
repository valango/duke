/**
 * @module parse
 *
 * Simple driver for debugging.
 */
'use strict'

const parse = require('../parse')

const res = parse(process.argv[2])

console.log('RES', res)
