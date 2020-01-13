'use strict'
const ME = 'RuleTree'

const { expect } = require('chai')
// const _ = require('lodash')
const RuleTree = require('../src/' + ME)
const { GLOB, NIL, TERM, TERM_EX } = RuleTree

const T1 = ['a/b', 'a/c/', 'f*', '!file']
const D1 = [
  [-1, /^a\/$/, 0],
  [0, /^b$/, TERM],
  [0, /^c\/$/, TERM],
  [-1, null, 0],
  [3, /^f/, TERM],
  [3, /^file$/, TERM_EX]
]

const t = new RuleTree(T1)

const idx = (a) => a.map((r) => r.index)

const test = (str, exp, anc = undefined) => {
  const r = t.match(str, anc)
  // console.log(`test '${str}'\n`, r)
  expect(idx(r)).to.eql(exp, anc === NIL ? str : str + ' @' + anc)
}

describe(ME, () => {
  it('should construct', () => {
    // console.log('DUMP', d)
    expect(t.tree).to.eql(D1)
  })

  it('should match', () => {
    expect(t.match('a')).to.eql([{ flag: 0, index: 3, rule: GLOB }], 'a')
    test('a/', [0, 3])
    test('foo', [4], 3)
    test('file', [5, 4], 3)
    test('nope', [], 3)
  })

  it('should test', () => {
    expect(t.test('a/')).to.eql(false, 'a/')
    expect(t.test('file').flag).to.eql(TERM_EX, 'file')
  })
})
