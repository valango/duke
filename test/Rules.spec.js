'use strict'
const ME = 'Ruler'
process.env.NODE_MODULES = 'test'

const { AssertionError } = require('assert')
const { expect } = require('chai')
const { inspect } = require('util')
const { DISCLAIM, CONTINUE, GLOB, NIL } = require('../src/definitions')
const YES = 0
const Ruler = require('..')[ME]

const T1 = [YES, 'a/b', 'a/c/', 'f*', '!file', '/z/y']
const D1 = [
  [NIL, GLOB, CONTINUE],     //  0
  [0, /^a$/, CONTINUE],
  [1, /^b$/, YES],          //  2
  [1, /^c$/, YES],
  [0, /^f/, YES],           //  4
  [0, /^file$/, DISCLAIM],
  [NIL, /^z$/, CONTINUE],    //  6
  [6, /^y$/, YES]
]

let t = new Ruler([YES, T1])
let n = 0, lastAnc

const match = (str, exp, anc = undefined) => {
  const r = t.match(str, anc)
  // console.log(`match '${str}': `, r)
  const v = r.map(o => o[3])
  expect(v).to.eql(exp, anc === NIL ? str : str + ' @' + ++n)
  return v
}

const test = (str, exp, prev, comm = '') => {
  const [act, ancs] = t.test(str, prev)
  lastAnc = ancs
  expect(act).to.eql(exp, `'${str}' -> ` + inspect(ancs) + ' ' + comm)
}

describe(ME, () => {
  beforeEach(() => {
    t = new Ruler(YES, T1)
    n = 0
  })

  it('should construct', () => {
    // console.log('DUMP', t.dump())
    expect(t.dump()).to.eql(D1)
    t = new Ruler({ action: 2, optimize: false }, '/a*')
    expect(t.dump()).to.eql([[NIL, /^a.*$/, 2]])
  })

  it('should match', () => {
    expect(t.match('z')).to.eql([[NIL, /^z$/, CONTINUE, 6]], 'z')
    let a
    a = match('z', [6])
    match('y', [7], a)
    match('y', [7], a)
    a = match('a', [1])
    match('b', [2], a)
    match('b', [2], a)
    match('c', [3], a)
    match('c', [3], [3, 1, 7])
    expect(lastAnc).to.eql(undefined, 'lastMatches')
  })

  it('should glob', () => {
    let a = match('n', [0])
    a = match('o', a, a)
    match('a', [1], a)
  })

  it('should test', () => {
    test('a', CONTINUE)
    expect(lastAnc).to.eql([[0, /^a$/, CONTINUE, 1]], 'lastMatches 1')
    test('nope', CONTINUE)
    expect(lastAnc).to.eql([[NIL, GLOB, CONTINUE, 0]], 'lastMatches 2')
    test('b', YES, [1])
    test('c', YES, [1])
    test('nope', CONTINUE, [0], '[0]')
    test('nope', CONTINUE, [NIL], '[NIL]')
    expect(new Ruler().test('a')).to.eql([DISCLAIM])
  })

  it('should throw on bad rule', () => {
    expect(() => t.add({})).to.throw(AssertionError, 'bad rule definition')
  })

  it('should check rule conflicts', () => {
    const old = t.tree
    t.add('a/b', YES)
    expect(() => t.add('a/b', 1)).to.throw(AssertionError, 'conflict @2')
    expect(t.tree).to.eql(old)
  })
})
