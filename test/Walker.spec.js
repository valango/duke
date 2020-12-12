//  Todo: use stubs instead of actual fs to test for retry conditions.
'use strict'
const ME = 'Walker'

const { sep } = require('path')
const { expect } = require('chai')
const { DO_ABORT, DO_SKIP, Walker } = require('..')
const t = require('./toNativePath')
const FILES = 1
const DIRS = 2
const ROOT = t('test/directory')
// const defaultRules = [DO_SKIP, 'node_modules', '.*']

const projectRules = [
  DO_ABORT, '*.html',
  DO_SKIP, '/node_modules/', '.*', '/to-be-skipped',
  FILES, 'item*.txt',
  DIRS, '*/', '!*skipped/'
]

let w, actionCounts

const onEntry = function (entry, ctx) {
  const action = this.onEntry(entry, ctx)
  actionCounts[action] = (actionCounts[action] || 0) + 1
  // console.log(ctx.absPath, entry.name, action /* , actionCounts */)
  return action
}

const returnError = () => new Error('Test')

const returnErrorAsync = async () => returnError()

const throwError = () => {
  throw new Error('Test')
}

const throwErrorAsync = async () => {
  return throwError()
}

const testWalk = async (options, msg) => {
  let res, w = new Walker({ rules: projectRules })
  try {
    res = await w.walk(undefined, options)
  } catch (error) {
    res = error
  }
  expect(res).to.be.instanceOf(Error, 'DID NOT THROW ' + msg)
  return w
}

describe(ME, () => {
  beforeEach(() => {
    actionCounts = {}
    w = new Walker({ rules: projectRules })
  })

  it('should construct w defaults', () => {
    // console.log(w.ruler.dump())
    expect(w.failures).to.eql([])
    expect(w.halted).to.equal(undefined)
    expect(w.duration).to.equal(0)
    expect(w.stats).to.eql(
      { dirs: 0, entries: 0, errors: 0, retries: 0, revoked: 0, walks: 0 })
  })

  it('should walk', async () => {
    const track = {}
    let ticks = 0, t
    w.tick = () => (ticks += 1)
    await w.walk(ROOT, {
      onEntry,
      trace: (key /* , result, context, args */) => {
        t = w.duration
        track[key] = (track[key] || 0) + 1
      }
    })
    expect(w.failures.length).to.equal(0, 'failures')
    expect(actionCounts[FILES]).to.equal(3, 'FILES')
    expect(actionCounts[DIRS]).to.equal(2, 'DIRS')
    expect(w.visited.size).to.equal(3, '#1')
    expect(Object.keys(track).sort()).to.eql(['onDir', 'onEntry', 'onFinal', 'openDir'])
    expect(ticks).to.eql(1, 'ticks')
    expect(w.stats).to.eql(
      { dirs: 3, entries: 11, errors: 3, retries: 0, revoked: 0, walks: 0 })
    expect(t).to.gt(0)
  })

  it('should avoid', async () => {
    w.avoid([[ROOT + t('/src/nested')]])
    await w.walk(ROOT)
    expect(w.stats.dirs).to.equal(2)
    expect(() => w.avoid({})).to.throw(TypeError)
  })

  it('should do default error handling', async () => {
    testWalk({ onEntry: throwError }, 'throw')
    testWalk({ onEntry: returnError }, 'return')
    testWalk({ onFinal: throwErrorAsync }, 'async throw')
    testWalk({ onFinal: returnErrorAsync }, 'async return')
  })

  it('should halt', async () => {
    expect(await w.walk(ROOT, {
      onEntry: function (entry, ctx) {
        if (entry.name === 'nested') {
          this.halt(ctx, 'test').halt() //  Only the first call should effect.
        }
        return 0
      }
    })).to.eql({})
    expect(w.halted.details).to.eql('test')
    // (/src\/$/)
    expect(w.halted.absPath).to.match(new RegExp(`\\${sep}src\\${sep}$`))
  })

  it('should do custom error override', async () => {
    // let data

    w.onError = function () {
      // data = { err, inst: this }
      return DO_SKIP
    }
    const res = await w.walk('nope')
    expect(res).to.eql({})
    expect(w.failures.length).to.eql(1, 'length')
    expect(w.failures[0].message).to.match(/^ENOENT:\s/, '[0]')
  })

  it('should immediately return non-numeric', async () => {
    const e = {}
    const r = await w.walk(undefined, { onFinal: async () => e })
    expect(r).to.equal(e)
    expect(w.visited.size).to.equal(1)
  })

  it('onDir throwing', async () => {
    try {
      await w.walk(undefined, { onDir: () => Promise.reject(new Error('Test')) })
    } catch (error) {
      expect(error.message).to.equal('Test')
      expect(error.context.locus).to.equal('onDir')
    }
    expect(w.visited.size).to.equal(0)
  })
})
