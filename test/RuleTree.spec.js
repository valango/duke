'use strict'
const ME = 'RuleTree'

const { expect } = require('chai')
// const _ = require('lodash')
const RuleTree = require('../src/' + ME)
const { GLOB, NIL, TERM, TERM_EX } = RuleTree

const T1 = ['a/b', 'a/c/', 'f*', '!file']
const D1 =[
      [-1, '^a\\/$', 0],
      [0, '^b$', TERM],
      [0, '^c\\/$', TERM],
      [-1, null, 0],
      [3, '^f.*$', TERM],
      [3, '^file$', TERM_EX]
    ]

const t = new RuleTree(T1)

const idx = (a) => a.map((r) => r.index)

const test = (anc, str, exp) => {
  const r = t.match(anc, str)
  // console.log(`test '${str}'\n`, r)
  expect(idx(r)).to.eql(exp, anc === NIL ? str : str + ' @' + anc)
}

describe(ME, () => {
  it('should construct', () => {
    const d = t.dump()
    // console.log('DUMP', d)
    expect(d).to.eql(D1)
    expect(t.inspect(3)).to.eql(D1[3])
    expect(t.inspect(4)).to.eql(D1[4])
    expect(() => t.inspect(10)).to.throw(TypeError, 'not iterable')
  })

  it('should match', () => {
    expect(t.match(NIL, 'a')).to.eql([{ flag: 0, index: 3, rule: GLOB }], 'a')
    test(NIL, 'a/', [0, 3])
    test(3, 'foo', [4])
    test(3, 'file', [5, 4])
    test(3, 'nope', [])
  })
})
