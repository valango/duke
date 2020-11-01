'use strict'
const ME = 'parsePath'

const { AssertionError } = require('assert')
const { expect } = require('chai')
const { T_DIR, T_FILE } = require('../src/constants')
const target = require('../src/' + ME)
const OPTIONAL_DIRS = null
const R_ANY = '.'
const ANY = { type: undefined, isExclusion: false }
const DIR = { type: T_DIR, isExclusion: false }
const XDIR = { type: T_DIR, isExclusion: true }
const XFIL = { type: T_FILE, isExclusion: true }
let options

const test = (str, expected, x = '') => {
  const r = target(str, options)
  expect(r).to.eql(expected, `'${str}' ` + x)
}

describe(ME, () => {
  beforeEach(() => (options = undefined))
  it('should do simple parse', () => {
    test('/a', [ANY, '^a$'])
    test('/a/', [DIR, '^a$'])
    test('a/', [DIR, OPTIONAL_DIRS, '^a$'])
    test('a', [ANY, OPTIONAL_DIRS, '^a$'])
    test('/*a', [ANY, 'a$'])
    test('/a/b*', [ANY, '^a$', '^b'])
    test('/*/a', [ANY, R_ANY, '^a$'])
    test('/a/*', [ANY, '^a$', R_ANY])
    test('**/a', [ANY, OPTIONAL_DIRS, '^a$'])
    test('/**/a', [ANY, OPTIONAL_DIRS, '^a$'])
    test('/a/**/b', [ANY, '^a$', OPTIONAL_DIRS, '^b$'])
    test('/a/**/b/', [DIR, '^a$', OPTIONAL_DIRS, '^b$'])
    test('/a/**/**/b/', [DIR, '^a$', OPTIONAL_DIRS, '^b$'])
  })

  it('should parse with type override', () => {
    test('/a;', [ANY, '^a$'])
    test('/a;d', [DIR, '^a$'])
  })

  it('should handle inversion', () => {
    test('!/a/  ', [XDIR, '^a$'])
    test('!/a!;f  ', [XFIL, '^a!$'])
    test('\\!a', [ANY, OPTIONAL_DIRS, '^!a$'])
  })

  it('should handle separator escape', () => {
    test('/a\\/b\\/c/d', [ANY, '^a\\/b\\/c$', '^d$'])
  })

  it('should handle trailing spaces', () => {
    test('/a  ', [ANY, '^a$'])
    test('/a\\ \\  ', [ANY, '^a\\s\\s$'])
  })

  it('should ignore repeated glob', () => {
    test('**/a/**', [DIR, OPTIONAL_DIRS, '^a$'])
  })

  it('should strip trailing glob', () => {
    //  Todo: give some analysis back to parser
    test('/a/**', [DIR, '^a$'])
    test('/a/**/', [DIR, '^a$'])
    test('/a/**/*', [ANY, '^a$', OPTIONAL_DIRS, R_ANY])
    test('/a/**/*/*', [ANY, '^a$', OPTIONAL_DIRS, R_ANY, R_ANY])
  })

  it('should strip trailing glob, unoptimized', () => {
    options = { optimize: false }
    test('/a/**/*/*', [ANY, '^a$', OPTIONAL_DIRS, '^.*$', '^.*$'])
    test('/a/b*', [ANY, '^a$', '^b.*$'])
  })

  it('should handle braces', () => {
    test('/a\\{b\\}{c,d}e', [ANY, '^a\\{b\\}(c|d)e$'], 1)
    options = { extended: false }
    test('/a\\{b\\}{c,d}e', [ANY, '^a\\{b\\}{c,d}e$'], 2)
  })

  it('should fail', () => {
    expect(() => target('  ')).to.throw(AssertionError, 'invalid', '\'  \'')
    expect(() => target('a//b')).to.throw(AssertionError, 'invalid', 'a//b')
    expect(() => target('/')).to.throw(AssertionError, 'invalid', '\'/\'')
  })
})
