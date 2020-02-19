'use strict'
const ME = 'Ruler'
process.env.NODE_MODULES = 'test'

const { AssertionError } = require('assert')
const { expect } = require('chai')
const { Ruler, DO_SKIP, DO_ABORT, T_ANY, T_DIR, T_FILE } =
        require('..')
const { CONTINUE, GLOB, NIL } = Ruler

const T1 = [
  DO_SKIP, '/skp-dir', 'skip*', '^skipnever*',
  1, 'src/**/*', 2, '*.js;f', 3, 'src/**/*.js',
  DO_ABORT, 'src/**/abort'
]

let n = 0, t

const check = (name, type, expected) => {
  const res = t.check(name, type)
  expect(res).to.equal(expected, `${name};${type} got ${res} not ${expected}`)
}

describe(ME, () => {
  beforeEach(() => {
    t = new Ruler(T1)
    n = 0
  })

  it('should construct', () => {
    // process.stdout.write(t.dump())
    expect(t.treeCopy.length).to.eql(10, 'treeCopy.len')
    expect(t.ancestors).to.eql([[CONTINUE, NIL]], 'ancestors')
    t = new Ruler({ nextRuleAction: 2, optimize: false }, '/a*')
    expect(t.treeCopy).to
      .eql([[T_DIR, GLOB, NIL, CONTINUE], [T_ANY, /^a.*$/, NIL, 2]],
        'mod.treeCopy')
  })

  it('should throw on bad rule', () => {
    expect(() => t.add(0)).to.throw(AssertionError, 'reserved')
    expect(() => t.add({})).to.throw(AssertionError, 'bad rule definition')
  })

  /* it('should match', () => {
    match('nomatch', T_FILE, [-1])
    expect(t.hasAction(DO_SKIP)).to.equal(false, 1)
    match('skipa', T_FILE, [2])
    expect(t.hasAction(DO_SKIP)).to.equal(true, 2)
    expect(t.hadAction(DO_SKIP)).to.equal(false, 3)
    match('skipnever', T_FILE, [-1])
    match('skipnever.js', T_FILE, [7])
    match('any.js', T_FILE, [7])
    match('src', T_DIR, [4])
    match('abort', T_FILE, [9, 6, 5], [4])
    match('skip.js', T_FILE, [2, 8, 7, 6, 5], [4])
    match('skipnever.js', T_FILE, [8, 7, 6, 5], [4])
    t = new Ruler()
    match('skipa', T_FILE, [-1])
  }) */

  it('should check', () => {
    expect(t.hadAction(CONTINUE)).to.equal(true)
    expect(t.hasAction(CONTINUE)).to.equal(false)
    check('nomatch', T_FILE, CONTINUE)
    check('skipa', T_FILE, DO_SKIP)
    check('skipnever', T_FILE, CONTINUE)
    check('skipnever.js', T_FILE, 2)
    check('any.js', T_FILE, 2)
    check('src', T_DIR, CONTINUE)
    t = t.clone(true)
    check('abort', T_FILE, DO_ABORT)
    check('skip.js', T_FILE, DO_SKIP)
    expect(t.hasAction(2)).to.equal(true)
    expect(t.hasAction(3)).to.equal(true)
    check('skipnever.js', T_FILE, 3)
    t = new Ruler()
    check('skipa', T_FILE, CONTINUE)
  })

  it('should clone', () => {
    let t1 = t.clone().add(2, '/two')
    expect(t1.treeCopy.length).to.eql(t.treeCopy.length + 1, 'length')
    // match('skip.js', T_FILE, [2, 8, 7, 6, 5], [4])
    // t1 = t.clone()
    // expect(t1.ancestors[0][1]).to.eql(4)
  })

  it('should concat', () => {
    let t1 = t.concat(t, t)
    expect(t1.treeCopy).to.eql(t.treeCopy, 'treeCopy')
    t1 = t.concat(new Ruler(10, 'x'))
    expect(t1.treeCopy[10]).to.eql([T_ANY, /^x$/, 0, 10], 'tree concat')
  })

  it('should dump diagnostics', () => {
    expect(t.dump().ancestors).to.eql(undefined)
    /*
    match('skip.js', T_FILE, [2, 8, 7, 6, 5], [4])
    expect(t.dump(false)).to.match(/ancestors:\s+\[\s+4\s+]/)
    expect(t.dump('nextRuleAction').split('\n').length).to.eql(2)
    expect(t.dump(2).split('\n').length).to.eql(2)
    expect(t.dump([2, 'nextRuleAction']).split('\n').length).to.eql(3)
     */
  })
})
