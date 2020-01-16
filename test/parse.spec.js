'use strict'
const ME = 'parse'

const { AssertionError } = require('assert')
const { expect } = require('chai')
const p = require('../src/' + ME)
const { ANY, GLOB } = p
const DIR = { isDirectory: true, isExclusion: false }
const SOME = { isDirectory: false, isExclusion: false }
const XDIR = { isDirectory: true, isExclusion: true }
const XOME = { isDirectory: false, isExclusion: true }
let options

const test = (str, exp, x = '') => {
  const r = p(str, options)
  expect(r).to.eql(exp, `'${str}' ` + x)
}

describe(ME, () => {
  beforeEach(() => (options = undefined))
  it('should do simple parse', () => {
    test('/a', [SOME, '^a$'])
    test('/a/', [DIR, '^a$'])
    test('a', [SOME, GLOB, '^a$'])
    test('/*a', [SOME, 'a$'])
    test('/a/b*', [SOME, '^a$', '^b'])
    test('/*/a', [SOME, ANY, '^a$'])
    test('/a/*', [SOME, '^a$', ANY])
    test('**/a', [SOME, GLOB, '^a$'])
    test('/**/a', [SOME, GLOB, '^a$'])
    test('/a/**/b', [SOME, '^a$', GLOB, '^b$'])
    test('/a/**/b/', [DIR, '^a$', GLOB, '^b$'])
  })

  it('should handle inversion', () => {
    test('!/a/  ', [XDIR, '^a$'])
    test('!/a!  ', [XOME, '^a!$'])
    test('\\!a', [SOME, GLOB, '^!a$'])
  })

  it('should handle separator escape', () => {
    test('/a\\/b\\/c/d', [SOME, '^a\\/b\\/c$', '^d$'])
  })

  it('should handle trailing spaces', () => {
    test('/a  ', [SOME, '^a$'])
    test('/a\\ \\  ', [SOME, '^a\\s\\s$'])
  })

  it('should ignore repeated glob', () => {
    test('**/a/**', [SOME, GLOB, '^a$', ANY])
  })

  it('should strip trailing glob', () => {
    //  Todo: give some analysis back to parser
    test('/a/**', [DIR, '^a$'])
    test('/a/**/', [DIR, '^a$'])
    test('/a/**/*', [DIR, '^a$'])
    test('/a/**/*/*', [SOME, '^a$', GLOB, ANY, ANY])
  })

  it('should strip trailing glob, unoptimized', () => {
    options = { optimize: false }
    test('/a/**/*/*', [SOME, '^a$', GLOB, '^.*$', '^.*$'])
    test('/a/b*', [SOME, '^a$', '^b.*$'])
  })

  it('should handle braces', () => {
    test('/a\\{b\\}{c,d}e', [SOME, '^a\\{b\\}(c|d)e$'], 1)
    options = { extended: false }
    test('/a\\{b\\}{c,d}e', [SOME, '^a\\{b\\}{c,d}e$'], 2)
  })

  it('should fail', () => {
    expect(() => p('  ')).to.throw(AssertionError, 'invalid', '\'  \'')
    expect(() => p('a//b')).to.throw(AssertionError, 'invalid', 'a//b')
    expect(() => p('/')).to.throw(AssertionError, 'invalid', '\'/\'')
  })
})
