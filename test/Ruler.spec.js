'use strict'
const ME = 'Ruler'
process.env.NODE_MODULES = 'test'

const { AssertionError } = require('assert')
const { expect } = require('chai')
const { CONTINUE, DO_SKIP, DO_ABORT, DISCLAIM, GLOB, NIL } = require(
  '../src/definitions')
const { Ruler } = require('..')

const T1 = [
  DO_SKIP, '/skp-dir', 'skip*', '!skipnever*',
  1, 'src/**/*', 2, 'src/**/*.js',
  DO_ABORT, 'src/**/abort'
]

const D1 = [
  [null, -1, CONTINUE],
  [/^skp-dir$/, -1, DO_SKIP],
  [/^skip/, 0, DO_SKIP],          // 2
  [/^skipnever/, 0, DISCLAIM],
  [/^src$/, 0, CONTINUE],         // 4
  [null, 4, CONTINUE],
  [/./, 5, 1],                    // 6
  [/\.js$/, 5, 2],
  [/^abort$/, 5, DO_ABORT]        // 8
]

let n = 0, t

const match = (str, exp, anc = undefined) => {
  if (anc) {
    if (anc === -1) {
      anc = [DISCLAIM, -1]
    } else {
      anc = anc.map(i => [t._tree[i][2], i])
    }
    // console.log(str, 'exp', exp, 'anc', anc)
    t = t.clone(anc)
  }
  const r = t.match(str, anc)
  // if (anc) console.log(`match '${str}': `, r)
  const v = r.map(o => o[1])
  expect(v).to.eql(exp, anc === NIL ? str : str + ' @' + ++n)
  return v
}

describe(ME, () => {
  beforeEach(() => {
    t = new Ruler(T1)
    n = 0
  })

  it('should construct', () => {
    // console.log('DR', t.dump())
    expect(t.dump(true)).to.eql(D1, 'dump(true)')
    expect(t.defaultAction).to.eql(DISCLAIM, 'defaultAction')
    expect(t.ancestors).to.equal(undefined, 'ancestors')
    t = new Ruler({ defaultAction: 6, nextRuleAction: 2, optimize: false },
      '/a*')
    expect(t.dump(true)).to
      .eql([[GLOB, NIL, CONTINUE], [/^a.*$/, NIL, 2]], 'mod.dump(true)')
  })

  it('should throw on bad rule', () => {
    expect(() => t.add({})).to.throw(AssertionError, 'bad rule definition')
    expect(() => t.add('x', 0, 'y')).to.throw(AssertionError, /reserved/)
  })

  it('should match', () => {
    match('skipa', [2])
    match('skipnever', [-1])
    match('src', [4])
    match('abort', [8, 6, 5], [4])
    match('skip.js', [7, 6, 5], [4])
    match('skipnever.js', [7, 6, 5], [4])
    t = new Ruler()
    match('skipa', [-1])
  })

  it('should clone', () => {
    let t1 = t.clone().add(2, '/two')
    expect(t1.dump(true).length).to.eql(t.dump(true).length + 1, 'length')
    match('skip.js', [7, 6, 5], [4])
    t1 = t.clone()
    expect(t1.ancestors[0][1]).to.eql(4)
  })

  it('should concat', () => {
    let t1 = t.concat(t, t)
    expect(t1.dump('tree')).to.eql(t.dump('tree'), 'dump.tree')
    t1 = t.concat(new Ruler(10, 'x'))
    expect(t1.dump(true)[9]).to.eql([/^x$/, 0, 10], 'tree conact')
  })

  it('should dump diagnostics', () => {
    expect(t.dump().ancestors).to.eql(undefined)
    match('skip.js', [7, 6, 5], [4])
    expect(t.dump().ancestors).to.eql([4])
  })

  it('should use defaultAction', () => {
    expect(t.match('skipnever')).to.eql([[DISCLAIM, NIL]], 'skipnever')
    expect(t.match('strange')).to.eql([[DISCLAIM, NIL]], 'strange')
    t.defaultAction = 0
    expect(t.match('skipnever')).to.eql([[DISCLAIM, NIL]], 'skipnever')
    expect(t.match('strange')).to.eql([[DISCLAIM, NIL]], 'strange')
    t.defaultAction = 1
    expect(t.match('skipnever')).to.eql([[1, NIL]], 'skipnever')
    expect(t.match('strange')).to.eql([[1, NIL]], 'strange')
  })
})
