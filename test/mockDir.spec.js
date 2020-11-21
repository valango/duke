'use strict'
process.env.NODE_ENV = 'test'

const { expect } = require('chai')
const { T_DIR, T_FILE, T_SYMLINK } = require('..')
const target = require('./mock-fs/openDir')
const E = Error

//  Node is either an array [contents, type] or object meaning a directory
const tree = {
  d1: {
    d11: {
      b1: ['a'],
      long: ['ab']
    },
    f1: ['b'],
    l1: ['./d11', T_SYMLINK]
  },
  d2: {}
}

const obj = entry => entry && ({ name: entry.name, type: entry._type })

const stub = target(tree)

describe('mockFs/openDir sync', () => {
  it('should open the root', () => {
    const dir = stub.opendirSync('/')

    expect(obj(dir.readSync())).to.be.eql({ name: 'd1', type: T_DIR })
    expect(obj(dir.readSync())).to.be.eql({ name: 'd2', type: T_DIR })
    expect(obj(dir.readSync())).to.be.equal(null)
    dir.closeSync()
    expect(() => dir.readSync()).to.throw('was closed')
    expect(() => dir.closeSync()).to.throw('was closed')
  })

  it('should open subdir', () => {
    const dir = stub.opendirSync('/d1')
    expect(obj(dir.readSync())).to.be.eql({ name: 'd11', type: T_DIR })
    expect(obj(dir.readSync())).to.be.eql({ name: 'f1', type: T_FILE })
    expect(obj(dir.readSync())).to.be.eql({ name: 'l1', type: T_SYMLINK })
    expect(obj(dir.readSync())).to.be.equal(null)
  })

  it('should fail with bad path', () => {
    expect(() => stub.opendirSync()).to.throw()
    expect(() => stub.opendirSync('d1/d2')).to.throw(E, "opendir 'd1'")
    expect(() => stub.opendirSync('/d1/d11/q')).to.throw(E, "opendir '/d1/d11/q'")
    expect(() => stub.opendirSync('/d1/d11/b1')).to.throw(E, "opendir '/d1/d11/b1'")
  })
})

describe('mockFs/openDir promise', () => {
  let dir

  it('should fail w bad dir', async () => {
    try {
      await stub.promises.opendir()
    } catch (error) {
      expect(error.message).to.match(/undefined$/)
    }
    try {
      await stub.promises.opendir('d2')
    } catch (error) {
      expect(error.message).to.match(/^no\ssuch/)
    }
  })

  it('should open', async () => {
    try {
      dir = await stub.promises.opendir('/d1')
      expect(dir.path).to.equal('/d1')
    } catch (error) {
      expect(error).to.eql({})
    }
  })

  it('should iterate', async () => {
    let i = 0
    /* eslint-disable-next-line */
    for await (const entry of dir) i += 1
    expect(i).to.equal(3)
    expect(await dir.close()).to.be.equal(undefined)
  })

  it('should read', async () => {
    /* eslint-disable-next-line */
    let i = 0, entry
    dir = await stub.promises.opendir('/d1')

    while ((entry = await dir.read()) !== null) i += 1
    expect(i).to.equal(3)
    expect(await dir.close()).to.be.equal(undefined)
  })

  it('should fail with closed dir', async () => {
    try {
      await dir.read()
    } catch (error) {
      expect(error).to.match(/closed/)
    }
    try {
      await dir.close()
    } catch (error) {
      expect(error).to.match(/closed/)
    }
  })
})
