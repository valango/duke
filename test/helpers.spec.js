'use strict'
const ME = 'helpers'
process.env.NODE_ENV = 'test'

const { expect } = require('chai')
const { name } = require('../package.json')
const { actionName, loadFile, typeName, DO_SKIP, T_FILE } = require('..')

describe(ME, () => {
  describe('loadFile', () => {
    it('should load normally', () => {
      const d = loadFile('package.json')
      expect(d).to.be.instanceOf(Buffer)
      expect(JSON.parse(d.toString()).name).to.equal(name)
    })

    it('should fail gracefully', () => {
      expect(loadFile('nope.js')).to.equal(undefined)
    })

    it('should throw on non-ENOENT', () => {
      expect(() => loadFile('package.json/nope')).to.throw(Error, 'ENOTDIR')
    })

    it('should behave mildly', () => {
      expect(loadFile('package.json', true)).to.be.instanceOf(Buffer)
      expect(loadFile('nope.js', true)).to.equal(undefined)
      expect(loadFile('package.json/nope', true)).to.be.instanceOf(Error)
    })
  })

  it('actionName', () => {
    expect(actionName({})).to.eql('{}', '{}')
    expect(actionName({ action: DO_SKIP, other: {} })).to.eql('{ action: DO_SKIP }')
    expect(actionName(DO_SKIP)).to.equal('DO_SKIP', 'DO_SKIP')
    expect(actionName(1)).to.equal('ACTION(1)', 'ACTION(1)')
    expect(actionName(-DO_SKIP)).to.equal('-DO_SKIP', '-DO_SKIP')
  })

  it('typeName', () => {
    expect(typeName(T_FILE)).to.equal('file')
    expect(typeName('')).to.equal(undefined)
  })
})
