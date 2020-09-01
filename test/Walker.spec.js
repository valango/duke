'use strict'
const ME = 'Walker'

const { expect } = require('chai')
const { DO_ABORT, DO_SKIP, loadFile, Ruler, Walker } = require('../src')
const COUNT = 1
const ROOT = 'test/directory'
const defaultRules = [
  DO_SKIP, 'node_modules', '.*'
]

const projectRules = [
  DO_ABORT, '*.html',
  DO_SKIP, '/node_modules/', '.*',
  COUNT, 'item*.txt'
]

let w, actionCounts

const options = {
  // trace: (what, ctx, act) => console.log(what + `\t'${ctx.dir}' '${ctx.name}' ${act}`),

  detect: function (context) {
    const { absDir } = context
    let v = loadFile(absDir + 'package.json')
    // console.log(`detect(${absDir}) --> ${!!v}`)

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

//  Plugin function calls Walker method and builds diagnostics.
const onEntry = function (ctx) {
  const action = this.onEntry(ctx)
  actionCounts[action] = (actionCounts[action] || 0) + 1
  return action
}

describe(ME, () => {
  beforeEach(() => {
    actionCounts = {}
    w = new Walker(options)
    w.defaultRuler = new Ruler(defaultRules)
    w.projectRuler = new Ruler(projectRules)
  })

  it('should construct w defaults', () => {
    // console.log(w.projectRuler.dump())
    expect(w.failures).to.eql([])
    expect(w.terminate).to.equal(false)
  })

  it('should walk synchronously', () => {
    w.walkSync(ROOT, { onEntry })
    expect(w.failures).to.eql([], 'failures')
    expect(actionCounts[COUNT]).to.equal(2, 'ACTION(COUNT)')
    expect(w.trees.length).to.equal(1, '#1')
    w.walkSync(ROOT, { onEntry })
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
      w.walkSync(ROOT, { onEntry })
      expect(w.failures).to.eql([], 'failures')
      // console.log('w.trees', w.trees)
      expect(w.trees.length).to.equal(2, 'trees.length')
    })
  })
})
