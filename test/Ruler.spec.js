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
  0, 'src/**/*', 1, 'src/**/*.js',
  DO_ABORT, 'src/**/abort'
]

const D1 = [
  [null, -1, CONTINUE],
  [/^skp-dir$/, -1, DO_SKIP],
  [/^skip/, 0, DO_SKIP],          // 2
  [/^skipnever/, 0, DISCLAIM],
  [/^src$/, 0, CONTINUE],         // 4
  [null, 4, CONTINUE],
  [/./, 5, 0],                    // 6
  [/\.js$/, 5, 1],
  [/^abort$/, 5, DO_ABORT]        // 8
]

let n = 0, t

const match = (str, exp, anc = undefined) => {
  if (anc) t = t.clone(anc.map(i => t.dump()[i].concat(i)))
  const r = t.match(str, anc)
  // console.log(`match '${str}': `, r)
  const v = r.map(o => o[3])
  expect(v).to.eql(exp, anc === NIL ? str : str + ' @' + ++n)
  return v
}

describe(ME, () => {
  beforeEach(() => {
    t = new Ruler(0, T1)
    n = 0
  })

  it('should construct', () => {
    // console.log('D0', t.dump())
    expect(t.dump()).to.eql(D1)
    expect(t.ancestors).to.equal(undefined, 'ancestors')
    t = new Ruler({ defaultAction: 2, optimize: false }, '/a*')
    expect(t.dump()).to.eql([[GLOB, NIL, CONTINUE], [/^a.*$/, NIL, 2]])
  })

  it('should throw on bad rule', () => {
    expect(() => t.add({})).to.throw(AssertionError, 'bad rule definition')
  })

  it('should match', () => {
    match('skipa', [2])
    match('skipnever', [])
    match('src', [4])
    match('abort', [8, 6, 5], [4])
    match('skip.js', [2, 7, 6, 5], [4])
    match('skipnever.js', [7, 6, 5], [4])
  })

  it('should clone', () => {
    let t1 = t.clone().add(2, '/two')
    expect(t1.dump().length).to.eql(t.dump().length + 1)
    match('skip.js', [2, 7, 6, 5], [4])
    t1 = t.clone()
    expect(t1.ancestors[0][3]).to.eql(4)
  })

  it('should concat', () => {
    const t1 = t.concat(t, t)
    // console.log('D1', t1.dump())
    expect(t1.dump()).to.eql(t.dump(), 'dumps')
  })
})
