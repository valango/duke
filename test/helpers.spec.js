'use strict'
const ME = 'helpers'

const { expect } = require('chai')
const relativize = require('../relativize')

describe(ME, () => {
  it('should relativize', () => {
    expect(relativize(__filename, process.cwd(), '.')).to.eql('./test/helpers.spec.js')
    expect(relativize(__filename, process.cwd())).to.eql('test/helpers.spec.js')
    expect(relativize(__filename, '~')).to.match(/^~.+\.js$/)
    expect(relativize(__filename)).to.match(/^\w.+\.js$/)
    expect(relativize('x')).to.eql('x')
    expect(() => relativize(__filename, 'a', 'b')).to.throw('relativize() arguments conflict')
  })
})
