'use strict'
const ME = 'Walker'

const { expect } = require('chai')
const { DO_ABORT, DO_SKIP, loadFile, Ruler, Walker } = require('../src')
const FILES = 1
const DIRS = 2
const ROOT = 'test/directory'
const defaultRules = [
  DO_SKIP, 'node_modules', '.*'
]

const projectRules = [
  DO_ABORT, '*.html',
  DO_SKIP, '/node_modules/', '.*', '/to-be-skipped',
  FILES, 'item*.txt',
  DIRS, '*/', '!*skipped/'
]

let w, actionCounts

const options = {
  // trace: (what, ctx, act) => console.log(what + `\t'${ctx.dir}' '${ctx.name}' ${act}`),
  plugins: {
    detect: function (context) {
      const { absDir } = context
      let v = loadFile(absDir + 'package.json')
      console.log(`detect(${absDir}) --> ${!!v}`)

      if (v) {
        v = JSON.parse(v.toString())
        context.ruler = this.projectRuler
        context.current = { absDir, name: v.name || '?' }
        this.trees.push(context.current)
      }
    },
    onBegin: function (ctx) {
      return /skipped$/.test(ctx.dir) ? DO_SKIP : this.onBegin(ctx)
    },
    onEnd: function (ctx) {
      return /skipped$/.test(ctx.dir) ? DO_ABORT : this.onEnd(ctx)
    }
  },
  trace: (fn, ctx, action) => {
    // console.log(fn, action, ctx.absDir, ctx.entryName || '')
  },
  rules: projectRules
}

const onEntry = function (ctx, entry) {
  const action = this.onEntry(ctx, entry)
  actionCounts[action] = (actionCounts[action] || 0) + 1
  // console.log(ctx.dirPath, entry.name, action, actionCounts)
  return action
}

const throwTest = () => {
  throw new Error('Test')
}

describe(ME, () => {
  beforeEach(() => {
    actionCounts = {}
    w = new Walker(options)
  })

  it('should construct w defaults', () => {
    // console.log(w.ruler.dump())
    expect(w.failures).to.eql([])
    expect(w.halted).to.equal(undefined)
    expect(w.getTotals()).to.eql({ entries: 0 })
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
    expect(w.failures).to.eql([], 'failures')
    expect(actionCounts[FILES]).to.equal(2, 'FILES')
    expect(actionCounts[DIRS]).to.equal(2, 'DIRS')
    expect(w.visited.size).to.equal(3, '#1')
    expect(Object.keys(track).sort()).to.eql(['onDir', 'onEntry', 'onFinal', 'opendir', 'ticks'])
    expect(track.ticks).to.eql(1)
    expect(w.getTotals()).to.eql({ entries: 8 })
  })

  it('should do default error handling', async () => {
    let data

    try {
      return await w.walk(undefined, { onEntry: throwTest })
    } catch (error) {
      expect(error.context.locus).to.equal('onEntry')
      return
    }
    expect(false).to.eql(true)
  })

  it('should do custom error override', async () => {
    let data, res

    w.onError = function (err) {
      data = { err, inst: this }
      return DO_SKIP
    }
    res = await w.walk('nope')
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

  it('onDir can return anything', async () => {
    let r = await w.walk(undefined, { onDir: () => 'stringy', onEntry: () => DO_ABORT })
    expect(r).to.eql({})
    expect(w.visited.size).to.equal(1)
    expect(w.visited.get(process.cwd() + '/')).to.equal('stringy')
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
