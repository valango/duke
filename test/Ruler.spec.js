'use strict'
const ME = 'Ruler'

const { AssertionError } = require('assert')
const { expect } = require('chai')
const { GLOB_DIRS } = require('../src/Ruler/parsePath')
const { Ruler, DO_NOTHING, DO_SKIP, DO_ABORT, T_DIR, T_FILE } = require('..')
Ruler.prototype.dump = require('../dumpRuler')
const NIL = -1

const T1 = [
  DO_SKIP, '/skip-dir/', 'skip*', '!skipnever*',
  1, 'src/**/*',
  2, '*.js;f',
  3, 'src/**/*.js',
  4, '/doc;f',
  5, '/*/**/a',
  6, '*/',
  DO_ABORT, 'src/**/abort'
]

let t

const check = (name, type, expected) => {
  const res = t.check(name, type)
  expect(res).to.equal(expected, `${name};${type} got ${res} not ${expected}`)
}

describe(ME, () => {
  beforeEach(() => {
    t = new Ruler(T1)
  })

  it('should construct', () => {
    if (process.env.VERBOSE) process.stdout.write(t.dump())
    expect(t._ancestors).to.eql([[DO_NOTHING, NIL]], '_ancestors')
    t = new Ruler({ optimize: false }, 2, '/a*')
    expect(t._tree).to
      .eql([[T_DIR, GLOB_DIRS, NIL, DO_NOTHING], [0, /^a.*$/, NIL, 2]],
        'mod._tree')
    t = new Ruler()
    expect(t._tree).to.eql([[T_DIR, GLOB_DIRS, NIL, DO_NOTHING]])
  })

  it('should throw on bad rule', () => {
    expect(() => t.add(0)).to.throw(AssertionError, 'reserved')
    expect(() => t.add({})).to.throw(AssertionError, 'bad rule definition')
  })

  it('should check', () => {
    check('doc', T_FILE, 4)
    check('nomatch', T_FILE, DO_NOTHING)
    check('skipa', T_FILE, DO_SKIP)
    check('skipnever', T_FILE, DO_NOTHING)
    check('skipnever.js', T_FILE, 2)
    check('any.js', T_FILE, 2)
    check('src', T_DIR, 6)
    t = t.clone(true)
    check('abort', T_FILE, DO_ABORT)
    check('doc', T_FILE, 1)
    check('skip.js', T_FILE, DO_SKIP)
    check('skipnever.js', T_FILE, 3)
    // t = new Ruler()
    check('skipa', T_FILE, DO_SKIP)
  })

  it('should handle long dir globs', () => {
    t = new Ruler(1, '/a/**/f/')
    check('a', T_DIR, DO_NOTHING)
    ;(t = t.clone(true)) && check('b', T_DIR, DO_NOTHING)
    ;(t = t.clone(true)) && check('c', T_DIR, DO_NOTHING)
    ;(t = t.clone(true)) && check('f', T_DIR, 1)
  })

  it('should clone', () => {
    const t1 = t.clone().add(2, '/two')
    expect(t1._tree.length).to.eql(t._tree.length + 1, 'length')
  })

  it('should handle dive', () => {
    check('doc', T_FILE, 4)
    check('doc', T_DIR, 6)
    t = t.clone(t.lastMatch)
    check('any.js', T_FILE, 2)
    check('doc', T_FILE, 0)
    check('duc', T_DIR, 6)
    t = t.clone(t.lastMatch)
    check('any.js', T_FILE, 2)
  })

  it('should dump diagnostics', () => {
    t.check('skip.js', T_FILE)
    // console.log(t.dump('tree,_lastMatch'))
    expect(t.dump(false)).to.match(/_ancestors:\s+\[\s\[/)
    expect(t.dump(2).split('\n').length).to.eql(2)
    expect(t.dump('_lastMatch, _ancestors').split('\n').length).to.eql(3)
    expect(t.dump(['_lastMatch', 0]).split('\n').length).to.eql(3)
  })
})
