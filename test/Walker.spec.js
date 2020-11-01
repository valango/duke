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
    expect(w.terminate).to.equal(undefined)
    expect(w.getTotals()).to.eql({ entries: 0 })
  })

  it('should walk', async () => {
    await w.walk(ROOT, { onEntry })
    expect(w.failures).to.eql([], 'failures')
    expect(actionCounts[FILES]).to.equal(2, 'FILES')
    expect(actionCounts[DIRS]).to.equal(2, 'DIRS')
    expect(w.visited.size).to.equal(3, '#1')
    // await w.walk(ROOT)
    // expect(w.visited.size).to.equal(1, '#2')
  })

  it('should register failure', () => {
    expect(w.registerFailure(new Error('test'), '1').failures[0].context).to.eql('1')
  })

  it('should do default error handling', async () => {
    let data

    w.onError = function (err, exp, args) {
      data = { args, err, exp, inst: this }
    }
    let res = await w.walk('nope')
    expect(res).to.equal(undefined)
    expect(w.terminate.locus).to.equal('opendir')
    expect(data.inst).to.equal(w, 'instance')
    expect(data.args).to.match(/\/nope$/, 'args')
    expect(w.failures.length).to.eql(1, 'length')
    expect(w.failures[0].message).to.match(/^ENOENT:\s/, '[0]')
    w.reset()

    try {
      await w.walk(undefined, { onEntry: throwTest })
      expect(false).to.eql(true)
    } catch (error) {
      expect(error.context.locus).to.equal('onEntry')
      expect(data.err.message).to.equal('Test')
    }
  })

  it('should fail w bad return value', async () => {
    try {
      await w.walk(undefined, { onFinal: () => 'bad-value' })
      expect(false).to.eql(true)
    } catch (error) {
      expect(w.terminate).to.be.equal(undefined)
      expect(error.context.locus).to.equal('onFinal')
    }
  })

  it('onDir can return anything', async () => {
    let r = await w.walk(undefined, { onDir: () => 'stringy', onEntry: () => DO_ABORT })
    expect(r).to.equal(undefined)
    expect(w.visited.size).to.equal(1)
    expect(w.visited.get(process.cwd() + '/')).to.equal('stringy')
    await w.walk(undefined, { onDir: throwTest })
    expect(w.visited.size).to.equal(1)
  })

  xit('should intercept exceptions', () => {
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

  /* xdescribe('nested mode', () => {
    before(() => (options.nested = true))

    it('should process rules', () => {
      w.walkSync(ROOT, { onEntry })
      expect(w.failures).to.eql([], 'failures')
      // console.log('w.trees', w.trees)
      expect(w.trees.length).to.equal(2, 'trees.length')
    })
  }) */
})
