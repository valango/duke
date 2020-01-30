'use strict'
const ME = 'Walker'
process.env.NODE_MODULES = 'test'

const { expect } = require('chai')
const { sep } = require('path')
const
  {
    DO_ABORT, DO_SKIP,
    actionName, loadFile, Ruler, Walker
  } = require('../src')

const defaultRules = ['node_modules', '.*']
const projectRules = [
  DO_ABORT, '*.html',
  DO_SKIP, '/node_modules', '.*',
  0, 'pa*.json', 1, '*.js'
]

let w, told, acts

const options = {
  defaultRuler: defaultRules,
  detect: function (context) {
    const { absDir } = context
    let v = loadFile(absDir + sep + 'package.json')

    if (v) {
      v = JSON.parse(v.toString())
      context.ruler = new Ruler(projectRules)
      context.current = { absDir, name: v.name || '?' }
    }
  },
  onBegin: function (ctx) {
    return /skipped$/.test(ctx.dir) ? DO_SKIP : this.onBegin(ctx)
  },
  onEnd: function (ctx) {
    return /skipped$/.test(ctx.dir) ? DO_ABORT : this.onEnd(ctx)
  },
  talk: (...args) => told.push(args) // && console.log('TALK:', args)
}

const onEntry = function (d) {
  const a = this.onEntry(d)
  // if (d.type === T_DIR) console.log(actionName(a), d.name)
  if (typeof a !== 'number') return a
  const k = actionName(a), n = acts[k] || 0
  acts[k] = n + 1
  return a
}

describe(ME, () => {
  beforeEach(() => {
    acts = {}
    told = []
    w = new Walker(options)
  })

  it('should construct w defaults', () => {
    expect(w.failures).to.eql([])
    expect(w.terminate).to.equal(false)
  })

  it('should walk synchronously', () => {
    w.defaultRuler.add([0, '/pack*.json', 1, '*.js'])
    w.walkSync({ onEntry })
    // console.log('TREES', w.trees)
    expect(w.failures).to.eql([], 'failures')
    expect(acts['ACTION(0)']).to.gte(2, 'cnt')
    expect(acts['ACTION(1)']).to.gte(15)
    expect(w.trees.length).to.equal(1, '#1')
    w.walkSync({ onEntry })
    expect(w.trees.length).to.equal(1, '#2')
  })

  it('should register failure', () => {
    expect(w.registerFailure('test', '1').failures[0]).to.eql('test\n  1')
  })

  it('should do default error handling', () => {
    let data, onError = function (e, d) {
      data = { args: d, instance: this }
    }
    w.walkSync('nope', { onError })
    expect(data.instance).to.equal(w, 'instance')
    expect(data.args).to.match(/\/nope$/, 'args')
    expect(w.failures.length).to.eql(1, 'length')
    expect(w.failures[0]).to.match(/^ENOENT:\s/, '[0]')
    w.failures = []
    expect(() => w.walkSync({
      onEntry: () => {
        throw Error('Test')
      }
    })).to.throw(Error, 'Test')
  })

  it('should walk in async mode', (done) => {
    w.walk().then(() => done())
  })

  it('should catch in async mode', (done) => {
    w.walk('/nope', { onError: (e) => e }).then(done)
      .catch((e) => {
        expect(e instanceof Error).to.eql(true)
        done()
      })
  })

  it('should intercept exceptions', () => {
    let data, error

    const onError = (e, d) => {
      error = e
      data = d
      return DO_SKIP
    }

    w.walkSync('nope', { onError })
    expect(error.code).to.eql('ENOENT')
    expect(data).to.match(/nope$/)
    expect(w.failures).to.eql([])
  })

  describe('nested mode', () => {
    before(() => (options.nested = true))

    it('should process rules', () => {
      w.defaultRuler.add([0, '/pack*.json', 1, '*.js'])
      w.walkSync({ onEntry })
      expect(w.failures).to.eql([], 'failures')
      expect(acts['ACTION(0)']).to.equal(3, 'ACTION(0)')
      expect(acts['ACTION(1)']).to.gte(15, 'ACTION(1)')
      // console.log('w.trees', w.trees)
      expect(w.trees.length).to.equal(2, 'trees.length')
    })
  })
})
