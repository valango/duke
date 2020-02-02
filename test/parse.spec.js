'use strict'
process.env.NODE_MODULES = 'test'
const ME = 'parse'

const { AssertionError } = require('assert')
// const { isDeepStrictEqual } = require('util')
const { expect } = require('chai')
const { GLOB, T_ANY, T_DIR, T_FILE } = require('../src/definitions')
const target = require('../src/' + ME)
const R_ANY = '.'
const ANY = { type: T_ANY, isExclusion: false }
const DIR = { type: T_DIR, isExclusion: false }
// const FILE = { type: T_FILE, isExclusion: false }
const XDIR = { type: T_DIR, isExclusion: true }
const XFIL = { type: T_FILE, isExclusion: true }
let options

const test = (str, exp, x = '') => {
  const r = target(str, options)
  // if (!isDeepStrictEqual(r, exp)) console.log(str + '\n', r, '\n', exp)
  expect(r).to.eql(exp, `'${str}' ` + x)
}

describe(ME, () => {
  beforeEach(() => (options = undefined))
  it('should do simple parse', () => {
    test('/a', [ANY, '^a$'])
    test('/a/', [DIR, '^a$'])
    test('a/', [DIR, GLOB, '^a$'])
    test('a', [ANY, GLOB, '^a$'])
    test('/*a', [ANY, 'a$'])
    test('/a/b*', [ANY, '^a$', '^b'])
    test('/*/a', [ANY, R_ANY, '^a$'])
    test('/a/*', [ANY, '^a$', R_ANY])
    test('**/a', [ANY, GLOB, '^a$'])
    test('/**/a', [ANY, GLOB, '^a$'])
    test('/a/**/b', [ANY, '^a$', GLOB, '^b$'])
    test('/a/**/b/', [DIR, '^a$', GLOB, '^b$'])
  })

  it('should parse with type override', () => {
    test('/a;', [ANY, '^a$'])
    test('/a;d', [DIR, '^a$'])
  })

  it('should handle inversion', () => {
    test('!/a/  ', [XDIR, '^a$'])
    test('!/a!;f  ', [XFIL, '^a!$'])
    test('\\!a', [ANY, GLOB, '^!a$'])
  })

  it('should handle separator escape', () => {
    test('/a\\/b\\/c/d', [ANY, '^a\\/b\\/c$', '^d$'])
  })

  it('should handle trailing spaces', () => {
    test('/a  ', [ANY, '^a$'])
    test('/a\\ \\  ', [ANY, '^a\\s\\s$'])
  })

  it('should ignore repeated glob', () => {
    test('**/a/**', [DIR, GLOB, '^a$'])
  })

  it('should strip trailing glob', () => {
    //  Todo: give some analysis back to parser
    test('/a/**', [DIR, '^a$'])
    test('/a/**/', [DIR, '^a$'])
    test('/a/**/*', [ANY, '^a$', GLOB, R_ANY])
    test('/a/**/*/*', [ANY, '^a$', GLOB, R_ANY, R_ANY])
  })

  it('should strip trailing glob, unoptimized', () => {
    options = { optimize: false }
    test('/a/**/*/*', [ANY, '^a$', GLOB, '^.*$', '^.*$'])
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
