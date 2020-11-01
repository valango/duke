'use strict'
process.env.NODE_ENV = 'test'

const { expect } = require('chai')
const target = require('../stubs/fs/openDir')

const tree = {
  d1: {
    d11: {
      b1: 'a',
      long: 'ab'
    },
    f1: 'b'
  },
  d2: {}
}

const obj = entry => entry && ({ name: entry.name, type: entry.isDirectory() ? 'd' : 'f' })

const stub = target(tree)

describe('stubs/fs/openDir sync', () => {
  it('should open the root', () => {
    const dir = stub.opendirSync('/')

    expect(obj(dir.readSync())).to.be.eql({ name: 'd1', type: 'd' })
    expect(obj(dir.readSync())).to.be.eql({ name: 'd2', type: 'd' })
    expect(obj(dir.readSync())).to.be.equal(null)
    dir.closeSync()
    expect(() => dir.readSync()).to.throw('was closed')
    expect(() => dir.closeSync()).to.throw('was closed')
  })

  it('should open subdir', () => {
    const dir = stub.opendirSync('/d1')
    expect(obj(dir.readSync())).to.be.eql({ name: 'd11', type: 'd' })
    expect(obj(dir.readSync())).to.be.eql({ name: 'f1', type: 'f' })
    expect(obj(dir.readSync())).to.be.equal(null)
  })

  it('should fail with bad path', () => {
    expect(() => stub.opendirSync()).to.throw()
    expect(() => stub.opendirSync('d1/d2')).to.throw("opendir 'd1'")
    expect(() => stub.opendirSync('/d1/d11/q')).to.throw("opendir '/d1/d11/q'")
    expect(() => stub.opendirSync('/d1/d11/b1')).to.throw("opendir '/d1/d11/b1'")
  })
})

describe('stubs/fs/openDir promise', () => {
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
    let i = 0, entry

    /* while ((entry = await dir.read()) !== null) {
      i += 1
    } */
    for await (const entry of dir) i += 1
    expect(i).to.equal(2)
    expect(await dir.close()).to.be.equal(undefined)
  })

  it('should read', async () => {
    let i = 0, entry
    dir = await stub.promises.opendir('/d1')

    while ((entry = await dir.read()) !== null) i += 1
    expect(i).to.equal(2)
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
