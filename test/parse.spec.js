'use strict'
const ME = 'parse'

const { AssertionError } = require('assert')
const { expect } = require('chai')
const p = require('../src/' + ME)
const { ANY } = p
const ALLD = { allDirs: true, hasDirs: true, isExclusion: false }
const DIRS = { allDirs: false, hasDirs: true, isExclusion: false }
const NONE = { allDirs: false, hasDirs: false, isExclusion: false }
const XALL = { allDirs: true, hasDirs: true, isExclusion: true }
let options

const test = (str, exp, x = '') => {
  const r = p(str, options)
  expect(r).to.eql(exp, `'${str}' ` + x)
}

describe(ME, () => {
  beforeEach(() => (options = undefined))
  it('should do simple parse', () => {
    test('/a', [ALLD, '^a$'])
    test('/a/', [ALLD, '^a$'])
    test('a', [NONE, '^a$'])
    test('/a/b*', [DIRS, '^a$', '^b'])
    test('/*/a', [DIRS, ANY, '^a$'])
    test('/a/*', [DIRS, '^a$', '.'])
    test('**/a', [DIRS, ANY, '^a$'])
    test('/**/a', [DIRS, ANY, '^a$'])
    test('/a/b', [DIRS, '^a$', '^b$'])
  })

  it('should handle inversion', () => {
    test('!/a  ', [XALL, '^a$'])
    test('!/a!  ', [XALL, '^a!$'])
    test('\\!a', [NONE, '^!a$'])
  })

  it('should handle separator escape', () => {
    test('a\\/b\\/c/d', [DIRS, '^a\\/b\\/c$', '^d$'])
  })

  it('should handle trailing spaces', () => {
    test('/a  ', [ALLD, '^a$'])
    test('/a\\ \\  ', [ALLD, '^a\\s\\s$'])
  })

  it('should ignore repeated glob', () => {
    test('**/a/**', [DIRS, ANY, '^a$', ANY])
  })

  it('should strip trailing glob', () => {
    //  Todo: give some analysis back to parser
    test('/a/**', [ALLD, '^a$'])
    test('/a/**/', [ALLD, '^a$'])
    test('/a/**/*', [ALLD, '^a$'])
    test('/a/**/*/*', [DIRS, '^a$', ANY, ANY, ANY])
  })

  it('should strip trailing glob, unoptimized', () => {
    options = { optimize: false }
    test('/a/**/*/*', [DIRS, '^a$', ANY, '^.*$', '^.*$'])
    test('/a/b*', [DIRS, '^a$', '^b.*$'])
  })

  it('should handle braces', () => {
    test('/a\\{b\\}{c,d}e', [ALLD, '^a\\{b\\}(c|d)e$'], 1)
    options = { extended: false }
    test('/a\\{b\\}{c,d}e', [ALLD, '^a\\{b\\}{c,d}e$'], 2)
  })

  it('should fail', () => {
    expect(() => p('  ')).to.throw(AssertionError, 'invalid', '\'  \'')
    expect(() => p('a//b')).to.throw(AssertionError, 'invalid', 'a//b')
    expect(() => p('/')).to.throw(AssertionError, 'invalid', '\'/\'')
  })
})
