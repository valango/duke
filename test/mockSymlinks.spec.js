'use strict'
process.env.NODE_ENV = 'test'

const { expect } = require('chai')
const { T_SYMLINK } = require('..')

const tree = {
  d0: {
    d0f0: ['F0']
  },
  d1: {
    d1l0: ['../d0', T_SYMLINK],
    d1l1: ['nope', T_SYMLINK],
    d1l2: ['../d0/d0f0', T_SYMLINK]
  }
}

const fs = require('./mock-fs/openDir')(tree)
require('./mock-fs/stat')(tree, fs)

describe('symlinksFinal', () => {
  it('realpathSync', () => {
    expect(fs.realpathSync('/d1/d1l0')).to.equal('/d0')
    expect(fs.realpathSync('/d1/d1l2')).to.equal('/d0/d0f0')
    expect(() => fs.realpathSync('/d1/d1l1')).to.throw(Error, 'no such')
  })

  it('statSync', () => {
    expect(fs.statSync('/d1/d1l0').isDirectory()).to.equal(true)
    expect(fs.statSync('/d1/d1l2').isFile()).to.equal(true)
    expect(() => fs.statSync('/d1/d1l1')).to.throw(Error, 'no such')
  })

  it('realpath', async () => {
    expect(await fs.realpathSync('/d1/d1l0')).to.equal('/d0')
  })
})
