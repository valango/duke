/**
 * @module parse
 *
 * Simple driver for debugging.
 */
'use strict'

const parse = require('../src/parse')

let res = parse('\\!a')
res = parse(process.argv[2]) || res

console.log('RES', res)
