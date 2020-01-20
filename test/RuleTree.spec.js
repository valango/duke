'use strict'
const ME = 'RuleTree'
process.env.NODE_MODULES = 'test'

const { AssertionError } = require('assert')
const { expect } = require('chai')
const { inspect } = require('util')
const { NO_MATCH, NOT_YET, GLOB, NIL } = require('../src/definitions')
const YES = 0
const RuleTree = require('../src/' + ME)

const T1 = [YES, 'a/b', 'a/c/', 'f*', '!file', '/z/y']
const D1 = [
  [NIL, GLOB, NOT_YET],     //  0
  [0, /^a$/, NOT_YET],
  [1, /^b$/, YES],          //  2
  [1, /^c$/, YES],
  [0, /^f/, YES],           //  4
  [0, /^file$/, NO_MATCH],
  [NIL, /^z$/, NOT_YET],    //  6
  [6, /^y$/, YES]
]

let t = new RuleTree(T1, YES)

// const idx = (a) => a.map((r) => r[0])
let n = 0

const match = (str, exp, anc = undefined) => {
  const r = t.match(str, anc)
  // console.log(`match '${str}': `, r)
  const v = r.map(o => o[3])
  expect(v).to.eql(exp, anc === NIL ? str : str + ' @' + ++n)
  return v
}

const test = (str, exp, prev) => {
  const r = t.test(str, prev)
  expect(r).to.eql(exp, `'${str}' -> ` + inspect(t.lastMatches))
}

describe(ME, () => {
  beforeEach(() => {
    t = new RuleTree(T1, YES)
    n = 0
    t.lastIndex = NIL
    t.lastMatches = undefined
  })

  it('should construct', () => {
    // console.log('DUMP', t.tree)
    expect(t.tree).to.eql(D1)
  })

  it('should match', () => {
    expect(t.match('z')).to.eql([[NIL, /^z$/, NOT_YET, 6]], 'z')
    let a
    a = match('z', [6])
    match('y', [7], a)
    match('y', [7], a)
    a = match('a', [1])
    match('b', [2], a)
    match('b', [2], a)
    match('c', [3], a)
    match('c', [3], [3, 1, 7])
    expect(t.lastMatches).to.eql(undefined, 'lastMatches')
  })

  it('should glob', () => {
    let a = match('n', [0])
    a = match('o', a, a)
    match('a', [1], a)
  })

  it('should test', () => {
    test('a', NOT_YET)
    expect(t.lastMatches).to.eql([[0, /^a$/, NOT_YET, 1]], 'lastMatches 1')
    test('nope', NO_MATCH)
    expect(t.lastMatches).to.eql([[0, /^a$/, NOT_YET, 1]], 'lastMatches 2')
    test('b', YES)
    test('c', YES, [1])
    test('nope', NOT_YET, [0])
    test('nope', NOT_YET, [NIL])
  })

  it('should throw on bad rule', () => {
    expect(() => t.add({})).to.throw(TypeError, 'bad definition {}')
  })

  it('should check rule conflicts', () => {
    const old = t.tree
    t.add('a/b', YES)
    expect(() => t.add('a/b', 1)).to.throw(AssertionError, 'conflict @2')
    expect(t.tree).to.eql(old)
  })
})
