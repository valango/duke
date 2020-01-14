'use strict'
const ME = 'parse'

const { AssertionError } = require('assert')
const { expect } = require('chai')
const { T_ANY, T_DIR } = require('../src/definitions')
const p = require('../src/' + ME)
const { ANY, EXCL } = p
let flags

const test = (str, exp, x = '') =>
  expect(p(str, flags)).to.eql(exp, `'${str}' ` + x)

describe(ME, () => {
  beforeEach(() => (flags = undefined))
  it('should do simple parse', () => {
    test('/a', [['^a$', T_ANY]])
    test('/a/', [['^a$', T_DIR]])
    test('a', [[ANY, T_DIR], ['^a$', T_ANY]])
    test('/a/b*', [['^a$', T_DIR], ['^b', T_ANY]])
    test('/*/a', [[ANY, T_DIR], ['^a$', T_ANY]])
    test('/a/*', [['^a$', T_DIR], ['.', T_ANY]])
    test('**/a', [[ANY, T_DIR], ['^a$', T_ANY]])
    test('/**/a', [[ANY, T_DIR], ['^a$', T_ANY]])
    test('/a/b', [['^a$', T_DIR], ['^b$', T_ANY]])
  })

  it('should handle inversion', () => {
    test('!/a  ', [EXCL, ['^a$', T_ANY]])
    test('!/a!  ', [EXCL, ['^a!$', T_ANY]])
    test('\\!a', [[ANY, T_DIR], ['^!a$', T_ANY]])
  })

  it('should handle separator escape', () => {
    test('a\\/b\\/c/d', [['^a\\/b\\/c$', T_DIR], ['^d$', T_ANY]])
  })

  it('should handle trailing spaces', () => {
    test('/a  ', [['^a$', T_ANY]])
    test('/a\\ \\  ', [['^a\\s\\s$', T_ANY]])
  })

  it('should ignore repeated glob', () => {
    test('**/a/**', [[ANY, T_DIR], ['^a$', T_DIR], [ANY, T_ANY]])
  })

  it('should strip trailing glob', () => {
    test('/a/**', [['^a$', T_DIR]])
    test('/a/**/', [['^a$', T_DIR]])
    test('/a/**/*', [['^a$', T_DIR]])
    test('/a/**/*/*',
      [['^a$', T_DIR], [ANY, T_DIR], [ANY, T_DIR], [ANY, T_ANY]])
  })

  it('should strip trailing glob, unoptimized', () => {
    flags = { optimize: false }
    test('/a/**/*/*',
      [['^a$', T_DIR], [ANY, T_DIR], ['^.*$', T_DIR], ['^.*$', T_ANY]])
    test('/a/b*', [['^a$', T_DIR], ['^b.*$', T_ANY]])
  })

  it('should handle braces', () => {
    test('/a\\{b\\}{c,d}e', [['^a\\{b\\}(c|d)e$', T_ANY]], 1)
    flags = { extended: false }
    test('/a\\{b\\}{c,d}e', [['^a\\{b\\}{c,d}e$', T_ANY]], 2)
  })

  it('should fail', () => {
    expect(() => p(' a')).to.throw(AssertionError, 'invalid', '\' a\'')
    expect(() => p('  ')).to.throw(AssertionError, 'invalid', '\'  \'')
    expect(() => p('/')).to.throw(AssertionError, 'invalid', '\'/\'')
    expect(() => p('**')).to.throw(AssertionError, 'invalid', '\'**\'')
  })
})
