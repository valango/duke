'use strict'
const ME = 'Ruler'
process.env.NODE_MODULES = 'test'

const { AssertionError } = require('assert')
const { expect } = require('chai')
const { inspect } = require('util')
const { DISCLAIM, CONTINUE, GLOB, NIL } = require('../src/definitions')
const YES = 0
const { Ruler } = require('..')

const T1 = [YES, 'a/b', 'a/c/', 'f*', '!file', '/z/y']
const D1 = [
  [GLOB, NIL, CONTINUE],     //  0
  [/^a$/, 0, CONTINUE],
  [/^b$/, 1, YES],          //  2
  [/^c$/, 1, YES],
  [/^f/, 0, YES],           //  4
  [/^file$/, 0, DISCLAIM],
  [/^z$/, NIL, CONTINUE],    //  6
  [/^y$/, 6, YES]
]

let n = 0, lastAnc, t, wCount = 0

const hook = (warning) => {
  wCount += 1
  process.stderr.write('This warning was part of test.\n')
}

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
  before(() => process.on('warning', hook))
  after(() => process.off('warning', hook))
  beforeEach(() => {
    t = new Ruler(YES, T1)
    n = wCount = 0
  })

  it('should construct', () => {
    console.log('D0', t.dump())
    expect(t.dump()).to.eql(D1)
    expect(t.ancestors).to.equal(undefined, 'ancestors')
    t = new Ruler({ defaultAction: 2, optimize: false }, '/a*')
    expect(t.dump()).to.eql([[/^a.*$/, NIL, 2]])
  })

  it('should warn about deprecated API', (done) => {
    let a = new Ruler({ action: 2 })
      .add(['a/b', 'a/c/', 'f*', '!file', '/z/y'], YES)
    expect(a.dump()).to.eql(t.dump(), 'old API')
    process.nextTick(() => {
      expect(wCount).to.equal(2, 'old API')
      a = new Ruler().add(YES, 'a/b', 'a/c/', 'f*', '!file', '/z/y')
      expect(a.dump()).to.eql(t.dump(), 'new API')
      process.nextTick(() => {
        expect(wCount).to.equal(2, 'new API')
        done()
      })
    })
  })

  it('should match', () => {
    expect(t.match('z')).to.eql([[/^z$/, NIL, CONTINUE, 6]], 'z')
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

  it('should test (old API)', () => {
    test('a', CONTINUE)
    expect(lastAnc).to.eql([[/^a$/, 0, CONTINUE, 1]], 'lastMatches 1')
    test('nope', CONTINUE)
    expect(lastAnc).to.eql([[GLOB, NIL, CONTINUE, 0]], 'lastMatches 2')
    test('b', YES, [1])
    test('c', YES, [1])
    test('nope', CONTINUE, [0], '[0]')
    test('nope', CONTINUE, [NIL], '[NIL]')
    expect(new Ruler().test('a')).to.eql([DISCLAIM])
  })

  it('should test', () => {
    expect(t.test('any', true)).to.equal(CONTINUE, 'any:CONTINUE')
    expect(t.test('file', true)).to.equal(DISCLAIM, 'file:DISCLAIM')
    expect(t.test('a', true)).to.equal(CONTINUE, 'a:CONTINUE')
    expect(t.test('b', true)).to.equal(YES, 'b:YES1')
    expect(t.test('b', true)).to.equal(YES, 'b:YES2')
  })

  it('should clone', () => {
    t.test('a', true)
    const t1 = t.clone().add(2, '/two')
    expect(t1.test('b', true)).to.equal(YES)
  })

  xit('should concat', () => {
    let t1 = t.concat(t)
    console.log('D1', t1.dump())
    expect(t1.dump()).to.eql(t.dump(), 'dumps')
  })

  it('should throw on bad rule', () => {
    expect(() => t.add({})).to.throw(AssertionError, 'bad rule definition')
  })

  xit('should check rule conflicts', () => {
    const old = t.tree
    t.add(YES, 'a/b')
    expect(() => t.add(1, 'a/b')).to.throw(AssertionError, 'conflict @2')
    expect(t.tree).to.eql(old, 'tree')
    expect(wCount).to.eql(0, 'wCount')
  })
})
