/**
 * @module parse
 *
 * Simple driver for debugging.
 */
'use strict'

const parse = require('../src/parse')
const { T_DIR } = require('../src/definitions')

let res = parse(process.argv[2] || '/a/**/*') || res

console.log('RES', res)

const RuleTree = require('../src/RuleTree')

const rt = new RuleTree(['a/b', 'a/c/', 'f*', '!file', '/z/y'])
res = rt.match('z')
console.log('match', res)
