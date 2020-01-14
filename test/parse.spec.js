'use strict'
const ME = 'parse'

const { AssertionError } = require('assert')
const { expect } = require('chai')
const p = require('../src/' + ME)
const { ANY, EXCL } = p
let flags

const test = (str, exp) => expect(p(str, flags)).to.eql(exp, `'${str}'`)

describe(ME, () => {
  beforeEach(() => (flags = undefined))
  it('should do simple parse', () => {
    test('a', [ANY, '^a$'])
    test('/a/b*', ['^a\\/$', '^b'])
    test('/*/a', ['\\/$', '^a$'])
    test('/a/*', ['^a\\/$', '.'])
    test('/a/', ['^a\\/$'])
    test('**/a', [ANY, '^a$'])
    test('/**/a', [ANY, '^a$'])
    test('/a/b', ['^a\\/$', '^b$'])
  })

  it('should handle inversion', () => {
    test('!/a  ', [EXCL, '^a$'])
    test('!/a!  ', [EXCL, '^a!$'])
    test('\\!a', [ANY, '^!a$'])
  })

  it('should handle separator escape', () => {
    test('a\\/b\\/c/d', ['^a\\/b\\/c\\/$', '^d$'])
  })

  it('should handle trailing spaces', () => {
    test('/a  ', ['^a$'])
    test('/a\\ \\  ', ['^a\\s\\s$'])
  })

  it('should ignore repeated glob', () => {
    test('**/a/**', [ANY, '^a\\/$', '.'])
  })

  it('should strip trailing glob', () => {
    test('/a/**', ['^a\\/$'])
    test('/a/**/', ['^a\\/$'])
    test('/a/**/*', ['^a\\/$'])
    test('/a/**/*/*', ['^a\\/$', ANY, '\\/$', '.'])
    flags = { optimize: false }
    test('/a/**/*/*', ['^a\\/$', ANY, '^.*\\/$', '^.*$'])
    test('/a/b*', ['^a\\/$', '^b.*$'])
  })

  it('should handle braces', () => {
    test('/a\\{b\\}{c,d}e', ['^a\\{b\\}(c|d)e$'])
    flags = { extended: false }
    test('/a\\{b\\}{c,d}e', ['^a\\{b\\}{c,d}e$'])
  })

  it('should fail', () => {
    expect(() => p(' a')).to.throw(AssertionError, 'invalid', '\' a\'')
    expect(() => p('  ')).to.throw(AssertionError, 'invalid', '\'  \'')
    expect(() => p('/')).to.throw(AssertionError, 'invalid', '\'/\'')
    expect(() => p('**')).to.throw(AssertionError, 'invalid', '\'**\'')
  })
})
