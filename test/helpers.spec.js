'use strict'
const ME = 'helpers'
process.env.NODE_ENV = 'test'

const { expect } = require('chai')
const { name } = require('../package.json')
const $ = require('..')

describe(ME, () => {
  describe('loadFile', () => {
    it('should load normally', () => {
      const d = $.loadFile('package.json')
      expect(d).to.be.instanceOf(Buffer)
      expect(JSON.parse(d.toString()).name).to.equal(name)
    })

    it('should fail gracefully', () => {
      expect($.loadFile('nope.js')).to.equal(undefined)
    })

    it('should throw on non-ENOENT', () => {
      expect(() => $.loadFile('package.json/nope')).to.throw(Error, 'ENOTDIR')
    })

    it('should behave mildly', () => {
      expect($.loadFile('package.json', true)).to.be.instanceOf(Buffer)
      expect($.loadFile('nope.js', true)).to.equal(undefined)
      expect($.loadFile('package.json/nope', true)).to.be.instanceOf(Error)
    })
  })

  it('actionName', () => {
    expect($.actionName({})).to.eql('{}', '{}')
    expect($.actionName({ action: 0, other: {} })).to.eql(
      '{ action: 0 }')
    expect($.actionName($.DO_SKIP)).to.equal('DO_SKIP', 'DO_SKIP')
    expect($.actionName(1)).to.equal('ACTION(1)', 'ACTION(1)')
    expect($.actionName(-$.DO_SKIP)).to.equal('-DO_SKIP', '-DO_SKIP')
  })

  it('should relativize', () => {
    expect($.relativize(__filename, process.cwd(), '.')).to.eql(
      './test/helpers.spec.js')
    expect($.relativize(__filename, process.cwd())).to.eql(
      'test/helpers.spec.js')
    expect($.relativize(__filename, '~')).to.match(/^~.+\.js$/)
    expect($.relativize(__filename)).to.match(/^\w.+\.js$/)
    expect($.relativize('x')).to.eql('x')
    expect(() => $.relativize(__filename, 'a', 'b')).to.throw('relativize() arguments conflict')
  })

  it('typeName', () => {
    expect($.typeName($.T_FILE)).to.equal('file')
    expect($.typeName('')).to.equal(undefined)
  })
})
