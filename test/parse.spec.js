'use strict'
const ME = 'parse'

const { AssertionError } = require('assert')
const { expect } = require('chai')
const p = require('../src/' + ME)

const test = (str, exp) => expect(p(str)).to.eql(exp, str)

describe(ME, () => {
  it('should do simple parse', () => {
    test('a', [null, 'a'])
    test('/a', ['a'])
    test('/*/a', ['.*/', 'a'])
    test('/a/*', ['a/', '.*'])
    test('/a/', ['a/'])
    test('**/a', [null, 'a'])
    test('/**/a', [null, 'a'])
    test('/a/b', ['a/', 'b'])
  })

  it('should ignore repeated glob', () => {
    test('**/a/**', [null, 'a/', '.*'])
  })

  it('should strip trailing glob', () => {
    test('/a/**', ['a/'])
    test('/a/**/', ['a/'])
    test('/a/**/*', ['a/'])
    test('/a/**/*/*', ['a/', null, '.*/', '.*'])
  })

  it('should fail', () => {
    expect(() => p('  ')).to.throw(AssertionError, 'invalid')
    expect(() => p('/')).to.throw(AssertionError, 'invalid')
    expect(() => p('**')).to.throw(AssertionError, 'invalid')
  })
})
