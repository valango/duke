'use strict'

const ME = 'pathTranslate'

const os = require('os')
const path = require('path')
const { expect } = require('chai')
const target = require('../' + ME)
const { core } = target

const test = () => {
  it('should translate', () => {
    const { join, sep } = target.core, cwd = join(process.cwd(), sep)
    expect(target('.')).to.eql('.')
    expect(target('')).to.eql('.')
    expect(target()).to.eql('.')
    expect(target('a/b')).to.eq(join('a', 'b'))
    expect(target('~')).to.eq(join(os.homedir()))
    expect(target('~/boo')).to.eq(join(os.homedir(), 'boo'))
    expect(target('.', true)).to.eql(cwd)
    expect(target('', true)).to.eql(cwd)
    expect(target(undefined, true)).to.eql(cwd)
    const p = target('boo', true)
    expect(p[p.length - 1]).to.eq(sep)
  })
}

describe(ME + ' POSIX', () => {
  before(() => (target.core = path.posix))
  after(() => (target.core = core))

  test()
})

describe(ME + ' win32', () => {
  before(() => (target.core = path.win32))
  after(() => (target.core = core))

  test()
})
