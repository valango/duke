'use strict'
const ME = 'Walker'
process.env.NODE_MODULES = 'test'

const { expect } = require('chai')
const { DO_ABORT, DO_SKIP, loadFile, Ruler, Walker } = require('../src')
const COUNT = 1
const defaultRules = [
  DO_SKIP, 'node_modules', '.*'
]
const projectRules = [
  DO_ABORT, '*.html',
  DO_SKIP, '/node_modules/', '.*',
  COUNT, '*.js'
]

let w, acts

const options = {
  /*
  trace: (what, ctx, act) => {
    if (what === 'onBegin' || what === 'onEnd') {
      console.log('-', what, ctx.absDir)
    }
    if (what === 'push') console.log('-', what, ctx.absDir, ctx.dir)
  }, */
  detect: function (context) {
    const { absDir } = context
    let v = loadFile(absDir + 'package.json')

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
}

const onEntry = function (ctx) {
  const r = this.onEntry(ctx), a = typeof r === 'object' ? r.action : r
  const n = acts[a] || 0
  acts[a] = n + 1
  return r
}

describe(ME, () => {
  beforeEach(() => {
    acts = {}
    w = new Walker(options)
    w.defaultRuler = new Ruler(defaultRules)
    w.projectRuler = new Ruler(projectRules)
  })

  it('should construct w defaults', () => {
    expect(w.failures).to.eql([])
    expect(w.terminate).to.equal(false)
  })

  it('should walk synchronously', () => {
    w.projectRuler.add([1, '/pack*.json', 1, '*.js;f'])
    w.walkSync('', { onEntry })
    expect(w.failures).to.eql([], 'failures')
    expect(acts[1]).to.gte(2, 'ACTION(1)')
    expect(w.trees.length).to.equal(1, '#1')
    w.walkSync('', { onEntry })
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
    expect(() => w.walkSync(undefined, {
      onEntry: () => {
        throw Error('Test')
      }
    })).to.throw(Error, /^Test\ncontext:\s/, 'thrown')
  })

  it('should walk in async mode', (done) => {
    w.walk('').then(() => done())
  })

  it('should catch in async mode', (done) => {
    w.walk('/nope', { onError: (e) => e }).then(() => {
      done(new Error('Failed'))
    }).catch((e) => {
      expect(e instanceof Error).to.equal(true, 'Error')
      expect(e.message).to.match(/^ENOENT: /, 'ENOENT')
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
      w.walkSync('.', { onEntry })
      expect(w.failures).to.eql([], 'failures')
      // expect(acts['ACTION(1)']).to.gte(15, 'ACTION(1)')
      // console.log('w.trees', w.trees)
      expect(w.trees.length).to.equal(2, 'trees.length')
    })
  })
})
