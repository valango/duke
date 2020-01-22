/**
 * Simple driver for debugging - not much a demo.
 */
'use strict'

const parse = require('../src/parse')
const { print } = require('./util')
// const { DO_SKIP } = require('../src/definitions')

let res = parse(process.argv[2] || '/a/**/*')

print('RES:', res)

const RuleTree = require('../src/RuleTree')

const rt = new RuleTree(null, 0)
// rt.add(['/nono'], DO_SKIP)
rt.add(['a/b', 'a/c/', 'f*', '!file', '/z/y'], 0)
rt.add('a/b', 0)
// console.log('T', rt.tree)
res = rt.test('a')
print('a', res, rt.lastMatches)
res = rt.test('b')
print('b', res, rt.lastMatches)
res = rt.test('b', [1])
print('b', res, rt.lastMatches)
