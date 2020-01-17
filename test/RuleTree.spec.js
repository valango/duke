'use strict'
const ME = 'RuleTree'

const { expect } = require('chai')
// const _ = require('lodash')
const { NO_MATCH, NOT_YET, GLOB, NIL } = require('../src/definitions')
const YES = 0
const RuleTree = require('../src/' + ME)

const T1 = ['a/b', 'a/c/', 'f*', '!file', '/z/y']
const D1 = [
  [NIL, GLOB, NOT_YET],
  [0, /^a$/, NOT_YET],
  [1, /^b$/, YES],
  [1, /^c$/, YES],
  [0, /^f/, YES],
  [0, /^file$/, NO_MATCH],
  [NIL, /^z$/, NOT_YET],
  [6, /^y$/, YES]
]

const t = new RuleTree(T1, YES)

// const idx = (a) => a.map((r) => r[0])
let n = 0

const match = (str, exp, anc = undefined) => {
  const r = t.match(str, anc)
  // console.log(`match '${str}': `, r)
  const v = r.map(o => o[3])
  expect(v).to.eql(exp, anc === NIL ? str : str + ' @' + ++n)
  return v
}

describe(ME, () => {
  beforeEach(() => {
    n = 0
  })

  it('should construct', () => {
    console.log('DUMP', t.tree)
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
  })

  it('should glob', () => {
    let a = match('n', [0])
    a = match('o', a, a)
    match('a', [1], a)
  })

  xit('should test', () => {
    test('a', YES, NO_MATCH)
    test('foo', YES, NO_MATCH)
    test('file', YES, NO_MATCH)
    test('nope', YES, NO_MATCH)
  })
})
