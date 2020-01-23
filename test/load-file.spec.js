'use strict'
const ME = 'loadFile'
process.env.NODE_ENV = 'test'

const { expect } = require('chai')
const { name } = require('../package.json')
const target = require('../src')[ME]

describe(ME, () => {
  it('should load normally', () => {
    const d = target('package.json')
    expect(d).to.be.instanceOf(Buffer)
    expect(JSON.parse(d.toString()).name).to.equal(name)
  })

  it('should fail gracefully', () => {
    expect(target('nope.js')).to.equal(undefined)
  })

  it('should throw on non-ENOENT', () => {
    expect(() => target('package.json/nope')).to.throw(Error, 'ENOTDIR')
  })

  it('should behave mildly', () => {
    expect(target('package.json', true)).to.be.instanceOf(Buffer)
    expect(target('nope.js', true)).to.equal(undefined)
    expect(target('package.json/nope', true)).to.be.instanceOf(Error)
  })
})
