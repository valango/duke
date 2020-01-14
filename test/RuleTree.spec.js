'use strict'
const ME = 'RuleTree'

const { expect } = require('chai')
// const _ = require('lodash')
const { A_EXCL, A_NOPE, NIL, T_ANY, T_DIR, T_FILE } = require('../src/definitions')
const RuleTree = require('../src/' + ME)

const T1 = ['a/b', 'a/c/', 'f*', '!file']
const D1 = [
  [NIL, /^a$/, T_DIR, A_NOPE],
  [0, /^b$/, T_ANY, A_NOPE],
  [0, /^c$/, T_DIR, A_NOPE],
  [NIL, /./, T_DIR, A_NOPE],
  [3, /^f/, T_ANY, A_NOPE],
  [3, /^file$/, T_ANY, A_EXCL]
]

const t = new RuleTree(T1)

// const idx = (a) => a.map((r) => r[0])

const test = (str, ty, exp, anc = NIL) => {
  const r = t.test(str, ty, anc)
  // console.log(`test '${str}': `, r)
  expect(r).to.eql(exp, anc === NIL ? str : str + ' @' + anc)
}

describe(ME, () => {
  it('should construct', () => {
    // console.log('DUMP', t.tree)
    expect(t.tree).to.eql(D1)
  })

  it('should match', () => {
    expect(t.match('a', T_DIR)).to.eql([[0, /^a$/, T_DIR, A_NOPE]], 'a')
  })

  it('should test', () => {
    test('a', T_FILE, A_EXCL)
    test('foo', T_FILE, A_EXCL)
    test('file', T_FILE, A_EXCL)
    test('nope', T_FILE, A_EXCL)
  })
})
