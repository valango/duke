'use strict'
const ME = 'Walker'

const { expect } = require('chai')
const { DO_ABORT, DO_SKIP, Walker } = require('../src')
const FILES = 1
const DIRS = 2
const ROOT = 'test/directory'
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

const throwTest = () => {
  throw new Error('Test')
}

describe(ME, () => {
  beforeEach(() => {
    actionCounts = {}
    w = new Walker({ rules: projectRules, symlinks: true })
  })

  it('should construct w defaults', () => {
    // console.log(w.ruler.dump())
    expect(w.failures).to.eql([])
    expect(w.halted).to.equal(undefined)
    expect(w.getStats()).to.eql({ dirs: 0, entries: 0, retries: 0, revoked: 0 })
  })

  it('should walk', async () => {
    const track = { ticks: 0 }
    await w.walk(ROOT, {
      onEntry,
      tick: () => (track.ticks += 1),
      trace: (key) => {
        track[key] = (track[key] || 0) + 1
      }
    })
    expect(w.failures.length).to.equal(2, 'failures')
    expect(actionCounts[FILES]).to.equal(3, 'FILES')
    expect(actionCounts[DIRS]).to.equal(2, 'DIRS')
    expect(w.visited.size).to.equal(3, '#1')
    expect(Object.keys(track).sort()).to.eql(['onDir', 'onEntry', 'onFinal', 'ticks'])
    expect(track.ticks).to.eql(1, 'ticks')
    expect(w.getStats()).to.eql({ dirs: 3, entries: 11, retries: 0, revoked: 1 })
  })

  it('should do default error handling', async () => {
    try {
      await w.walk(undefined, { onEntry: throwTest })
    } catch (error) {
      expect(error.context.locus).to.equal('onEntry')
      return
    }
    expect(false).to.eql(true)
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
    const e = new Error('Test')
    const r = await w.walk(undefined, { onFinal: async () => e })
    expect(r).to.equal(e)
    expect(w.visited.size).to.equal(1)
  })

  it('onDir throwing', async () => {
    try {
      await w.walk(undefined, { onDir: throwTest })
    } catch (error) {
      expect(error.message).to.equal('Test')
      expect(error.context.locus).to.equal('onDir')
    }
    expect(w.visited.size).to.equal(0)
  })
})
