'use strict'
const ME = 'Ruler'
process.env.NODE_MODULES = 'test'

const { AssertionError } = require('assert')
const { expect } = require('chai')
const { inspect } = require('util')
const { DISCLAIM, CONTINUE, DO_SKIP, DO_ABORT, GLOB, NIL, ROOT } = require(
  '../src/definitions')
const { Ruler } = require('..')

const T1 = [
  DO_SKIP, '/skp-dir', 'skip*', `!skipnever`,
  0, 'src/**/*', 1, 'src/**/*.js',
  DO_ABORT, 'src/**/abort'
]

const D1 = [
  [ null, -1, -5 ],
  [ /^skp-dir$/, -1, -3 ],
  [ /^skip/, 0, -3 ],         // 2
  [ /^skipnever$/, 0, -4 ],
  [ /^src$/, 0, -5 ],         // 4
  [ null, 4, -5 ],
  [ /./, 5, 0 ],              // 6
  [ /\.js$/, 5, 1 ],
  [ /^abort$/, 5, -2 ]        // 8
]

let n = 0, lastAnc, t, wCount = 0

const hook = () => {
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
    t = new Ruler(0, T1)
    n = wCount = 0
  })

  it('should construct', () => {
    console.log('D0', t.dump())
    expect(t.dump()).to.eql(D1)
    expect(t.ancestors).to.equal(undefined, 'ancestors')
    t = new Ruler({ defaultAction: 2, optimize: false }, '/a*')
    expect(t.dump()).to.eql([[GLOB, NIL, CONTINUE], [/^a.*$/, NIL, 2]])
  })

  it('should throw on bad rule', () => {
    expect(() => t.add({})).to.throw(AssertionError, 'bad rule definition')
    console.log('skp-dir', t.match('skipa'))
  })

  /*
  xit('should match', () => {
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

  xit('should glob', () => {
    let a = match('n', [0])
    a = match('o', a, a)
    match('a', [1], a)
  })

  xit('should test (old API)', () => {
    test('a', CONTINUE)
    expect(lastAnc).to.eql([[/^a$/, 0, CONTINUE, 1]], 'lastMatches 1')
    test('nope', CONTINUE)
    expect(lastAnc).to.eql([[ROOT, NIL, CONTINUE, 0]], 'lastMatches 2')
    test('b', 0, [1])
    test('c', 0, [1])
    test('nope', CONTINUE, [0], '[0]')
    test('nope', CONTINUE, [NIL], '[NIL]')
    expect(new Ruler().test('a')).to.eql([DISCLAIM])
  })

  xit('should test', () => {
    expect(t.test('any', true)).to.equal(CONTINUE, 'any:CONTINUE')
    expect(t.test('file', true)).to.equal(DISCLAIM, 'file:DISCLAIM')
    expect(t.test('a', true)).to.equal(CONTINUE, 'a:CONTINUE')
    expect(t.test('b', true)).to.equal(0, 'b:YES1')
    expect(t.test('b', true)).to.equal(0, 'b:YES2')
  })

  xit('should clone', () => {
    t.test('a', true)
    const t1 = t.clone().add(2, '/two')
    expect(t1.test('b', true)).to.equal(0)
  })

  xit('should concat', () => {
    let t1 = t.concat(t, t)
    // console.log('D1', t1.dump())
    expect(t1.dump()).to.eql(t.dump(), 'dumps')
  }) */

  /*
  it('should check rule conflicts', () => {
    const old = t.tree
    t.add(0, 'a/b')
    expect(() => t.add(1, 'a/b')).to.throw(AssertionError, 'conflict @2')
    expect(t.tree).to.eql(old, 'tree')
    expect(wCount).to.eql(0, 'wCount')
  }) */
})
