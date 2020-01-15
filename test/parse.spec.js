'use strict'
const ME = 'parse'

const { AssertionError } = require('assert')
const { expect } = require('chai')
const p = require('../src/' + ME)
const { ANY, HAS_DIRS, ALL_DIRS, IS_EXCL } = p
let flags

const test = (str, exp, x = '') =>
  expect(p(str, flags)).to.eql(exp, `'${str}' ` + x)

describe(ME, () => {
  beforeEach(() => (flags = undefined))
  it('should do simple parse', () => {
    test('/a', [ALL_DIRS + HAS_DIRS, '^a$'])
    test('/a/', [ALL_DIRS + HAS_DIRS, '^a$'])
    test('a', ['', '^a$'])
    test('/a/b*', [HAS_DIRS, '^a$', '^b'])
    test('/*/a', [HAS_DIRS, ANY, '^a$'])
    test('/a/*', [HAS_DIRS, '^a$', '.'])
    test('**/a', [HAS_DIRS, ANY, '^a$'])
    test('/**/a', [HAS_DIRS, ANY, '^a$'])
    test('/a/b', [HAS_DIRS, '^a$', '^b$'])
  })

  it('should handle inversion', () => {
    test('!/a  ', [IS_EXCL + ALL_DIRS + HAS_DIRS, '^a$'])
    test('!/a!  ', [IS_EXCL + ALL_DIRS + HAS_DIRS, '^a!$'])
    test('\\!a', ['', '^!a$'])
  })

  it('should handle separator escape', () => {
    test('a\\/b\\/c/d', [HAS_DIRS, '^a\\/b\\/c$', '^d$'])
  })

  it('should handle trailing spaces', () => {
    test('/a  ', [ALL_DIRS + HAS_DIRS, '^a$'])
    test('/a\\ \\  ', [ALL_DIRS + HAS_DIRS, '^a\\s\\s$'])
  })

  it('should ignore repeated glob', () => {
    test('**/a/**', [HAS_DIRS, ANY, '^a$', ANY])
  })

  it('should strip trailing glob', () => {
    //  Todo: give some analysis back to parser
    test('/a/**', [ALL_DIRS + HAS_DIRS, '^a$'])
    test('/a/**/', [ALL_DIRS + HAS_DIRS, '^a$'])
    test('/a/**/*', [ALL_DIRS + HAS_DIRS, '^a$'])
    test('/a/**/*/*', [HAS_DIRS, '^a$', ANY, ANY, ANY])
  })

  it('should strip trailing glob, unoptimized', () => {
    flags = { optimize: false }
    test('/a/**/*/*', [HAS_DIRS, '^a$', ANY, '^.*$', '^.*$'])
    test('/a/b*', [HAS_DIRS, '^a$', '^b.*$'])
  })

  it('should handle braces', () => {
    test('/a\\{b\\}{c,d}e', [ALL_DIRS + HAS_DIRS, '^a\\{b\\}(c|d)e$'], 1)
    flags = { extended: false }
    test('/a\\{b\\}{c,d}e', [ALL_DIRS + HAS_DIRS, '^a\\{b\\}{c,d}e$'], 2)
  })

  it('should fail', () => {
    expect(() => p('  ')).to.throw(AssertionError, 'invalid', '\'  \'')
    expect(() => p('a//b')).to.throw(AssertionError, 'invalid', 'a//b')
    expect(() => p('/')).to.throw(AssertionError, 'invalid', '\'/\'')
  })
})
