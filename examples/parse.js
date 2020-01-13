/**
 * @module parse
 *
 * Simple driver for debugging.
 */
'use strict'

const parse = require('../src/parse')

// const res = parse('a/')
const res = parse(process.argv[2])

console.log('RES', res)
