'use strict'
const ME = 'Sincere'

const { expect } = require('chai')
const { AssertionError } = require('assert')
const { resolve } = require('path')
const path = resolve('src/' + ME + '.js')
const oldEnv = process.env.NODE_ENV
const purge = () => delete require.cache[path]

let o, trace, Derived, Sincere

const hook = function (loc, args) {
  trace.push({ o: this, loc, args })
}

const load = (env) => {
  purge()
  process.env.NODE_ENV = env
  Sincere = require(path)

  Derived = class D extends Sincere {
    get sincereId () {
      return super.sincereId + '!'
    }
  }
}

describe(ME, () => {
  after(purge)

  beforeEach(() => {
    Sincere.sincereHook(false)
    trace = []
    o = new Derived()
  })

  describe('production mode', () => {
    before(() => load('production'))

    it('should construct', () => {
      expect(o.sincereId).to.equal('D#0!')
      expect(new Sincere().sincereId).to.equal('Sincere#1')
      Sincere.sincereReset()  //  Should have no effect.
      expect(new Sincere().sincereId).to.equal('Sincere#2')
    })

    it('should assert', () => {
      const old = Sincere.sincereHook()
      expect(Sincere.sincereHook(hook)).to.equal(old)
      expect(o.assert('data', 'never')).to.equal('data')
      expect(() => o.assert(0, 'test', 'M%i', 1, 2)).to.throw(
        AssertionError, /D#\d+!\.test: M1 2$/)
      expect(trace).to.eql([])
    })
  })

  describe('development mode', () => {
    before(() => load(oldEnv))

    it('should construct', () => {
      const a = new Sincere()
      const b = new Derived()
      Derived.sincereReset()
      const c = new Derived()
      const d = new Sincere()
      expect(o.className).to.equal('D')
      expect(o.sincereId).to.equal('D#0!')
      expect(a.sincereId).to.equal('Sincere#1')
      expect(b.sincereId).to.equal('D#2!')
      expect(c.sincereId).to.equal('D#0!')
      expect(d.sincereId).to.equal('Sincere#1')
    })

    it('should assert', () => {
      Sincere.sincereHook(hook)
      expect(o.assert('data', 'never')).to.equal('data')
      expect(trace).to.eql([])
      expect(() => o.assert(0, 'test', 'M/%i', 1, 2)).to.throw(
        AssertionError, 'D#2!.test: M/1 2')
      expect(trace).to.eql([{ o, loc: 'test', args: ['M/%i', 1, 2] }])
      Sincere.sincereHook(false)
      expect(() => o.assert(0, 'test', 'M/%i', 1, 2)).to.throw(
        AssertionError, 'D#2!.test: M/1 2')
      expect(trace).to.eql([{ o, loc: 'test', args: ['M/%i', 1, 2] }])
    })
  })
})
