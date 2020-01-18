/**
 * Simple driver for debugging.
 */
'use strict'

const parse = require('../src/parse')
const { DO_SKIP } = require('../src/definitions')

let res = parse(process.argv[2] || '/a/**/*') || res

console.log('RES', res)

const RuleTree = require('../src/RuleTree')

const rt = new RuleTree(null, 0)
// rt.add(['/nono'], DO_SKIP)
rt.add(['a/b', 'a/c/', 'f*', '!file', '/z/y'], 0)
rt.add('a/b', 0)
// console.log('T', rt.tree)
res = rt.test('a')
console.log('a', res, rt.lastMatches)
res = rt.test('b')
console.log('b', res, rt.lastMatches)
res = rt.test('b', [1])
console.log('b', res, rt.lastMatches)
