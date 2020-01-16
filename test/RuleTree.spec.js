'use strict'
const ME = 'RuleTree'

const { expect } = require('chai')
// const _ = require('lodash')
const { A_EXCL, A_NOPE, GLOB, NIL, T_ANY, T_DIR, T_FILE }
        = require('../src/definitions')
const RuleTree = require('../src/' + ME)

const T1 = ['a/b', 'a/c/', 'f*', '!file', '/z/y']
const D1 = [
  [NIL, GLOB, true, A_NOPE],
  [0, /^a$/, true, A_NOPE],
  [1, /^b$/, false, A_NOPE],
  [1, /^c$/, true, A_NOPE],
  [0, /^f/, false, A_NOPE],
  [0, /^file$/, false, A_EXCL],
  [NIL, /^z$/, true, A_NOPE],
  [6, /^y$/, false, A_NOPE]
]

const t = new RuleTree(T1)

// const idx = (a) => a.map((r) => r[0])
let n = 0

const match = (str, exp, ty = undefined, anc = undefined) => {
  const r = t.match(str, ty, anc)
  // console.log(`match '${str}': `, r)
  const v = r.map(o => o[4])
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
    expect(t.match('z', true)).to.eql([[NIL, /^z$/, true, A_NOPE, 6]], 'z')
    let a
    a = match('z', [6], true)
    match('y', [7], false, a)
    match('y', [7], true, a)
    a = match('a', [1], true)
    match('b', [2], false, a)
    match('b', [2], true, a)
    match('c', [3], true, a)
  })

  xit('should test', () => {
    test('a', T_FILE, A_EXCL)
    test('foo', T_FILE, A_EXCL)
    test('file', T_FILE, A_EXCL)
    test('nope', T_FILE, A_EXCL)
  })
})
