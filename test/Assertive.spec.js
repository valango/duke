'use strict'
const ME = 'Assertive'

const { expect } = require('chai')
const { AssertionError } = require('assert')
const Assertive = require('../src/' + ME)

class D extends Assertive {
  get name () {
    return super.name + '!'
  }
}

let a

describe(ME, () => {
  beforeEach(() => {
    Assertive.reset()
    a = new D()
  })

  it('should construct', () => {
    expect(a.name).to.equal('D#0!')
    expect(new Assertive().name).to.equal('Assertive#1')
  })

  it('should assert', () => {
    expect(a.assert('data', 'never')).to.equal('data')
    expect(() => a.assert(0, 'test', 'M/%i', 1, 2)).to.throw(
      AssertionError, 'D.test: M/1 2')
  })
})
