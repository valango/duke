'use strict'
process.env.NODE_ENV = 'test'

// const { sep } = require('path')
const sep = '/'
const { expect } = require('chai')
const { DO_SKIP, T_DIR, T_SYMLINK } = require('..')
const { createDirEntry } = require('../src/util/dirEntry')
const target = require('../symlinksFinal')
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

const me = { failures: [], closure: { threadCount: 1 } }

describe('symlinksFinal', () => {
  before(() => {
    target.mockFs(fs)
  })
  after(() => {
    target.mockFs(require('fs'))
  })

  it('should ignore', async () => {
    expect(await target(
      [createDirEntry('x1', T_DIR, 0), createDirEntry('x2', T_SYMLINK, DO_SKIP)],
      { absPath: sep + 'foo', closure: {} })).to.equal(0)
  })

  it('should do', async () => {
    const entries = [
      createDirEntry('x', T_SYMLINK, 0),
      createDirEntry('d1l2', T_SYMLINK, 0),
      createDirEntry('d1l0', T_SYMLINK, 0),
      createDirEntry('d1l1', T_SYMLINK, 42)
    ]
    expect(await target.call(me, entries,
      { absPath: sep + 'd1' + sep, closure: {} })).to.equal(0)
    expect(me.failures.length).to.equal(2)
    expect(me.failures[0].message).to.match(/broken\ssymlink/)
    expect(me.failures[1].message).to.match(/broken\ssymlink/)
  })

  it('should halt', async () => {
    me.failures = []
    me.halted = 42
    const entries = [
      createDirEntry('d1l2', T_SYMLINK, 0),
      createDirEntry('nope', T_SYMLINK, 0)
    ]
    expect(await target.call(me, entries, { absPath: '/d1/', closure: {} })).to.equal(0)
    expect(me.failures.length).to.equal(0)
    // console.log(me.failures.map(e => e.message))
  })
})
