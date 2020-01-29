'use strict'
const ME = 'Walker'
process.env.NODE_MODULES = 'test'

const { expect } = require('chai')
const _ = require('lodash')
const { DISCLAIM, DO_ABORT, DO_SKIP, actionName } = require(
  '../src/definitions')
const Ruler = require('../src').Ruler
const W = require('..')[ME]
const options = {
  // talk: console.log
}

let w, context, count, ruler

describe(ME, () => {
  beforeEach(() => {
    ruler = new Ruler([DO_SKIP, '/node_modules', '.*'])
    w = new W(options)
    context = undefined
    count = 0
  })

  it('should construct w defaults', () => {
    expect(w.failures).to.eql([])
    expect(w.terminate).to.equal(false)
  })

  it('should visit and register failure', () => {
    const onEntry = (d) => {
      context = d
      ++count
      w.registerFailure('a', 'test')
      w.registerFailure(new Error('b'))
      return DO_ABORT
    }
    w = new W({ onEntry })
    w.walkSync(process.cwd(), { onEntry })
    expect(count).to.equal(1, 'count')
    expect(_.pick(context, ['dir', 'depth'])).to
      .eql({ depth: 0, dir: '' })
    expect(w.failures[0]).to.eql('a\n  test')
    expect(w.failures.length).to.equal(2)
  })

  it('should process rules', () => {
    let cnt = 0
    const onEntry = (d) => {
      const a = ruler.match(d.name), action = a[0] ? a[0][0] : DISCLAIM
      if (action < DO_SKIP) {
        if (action === 1) ++count
        if (action === 0) ++cnt
      }
      return action
    }
    ruler.add([0, '/pack*.json', 1, '*.js'])
    w = new W({ onEntry })
    w.walkSync(process.cwd())
    expect(w.failures).to.eql([], 'failures')
    expect(cnt).to.equal(3, 'cnt')
    expect(count).to.gte(15)
  })

  it('should register exceptions', () => {
    let data
    w = new W({
      onError: function (e, d) {
        data = { args: d, instance: this }
      }
    })
    w.walkSync(process.cwd() + '/nope')
    expect(data.instance).to.equal(w, 'instance')
    expect(data.args).to.match(/\/nope$/, 'args')
    expect(w.failures.length).to.eql(1, 'length')
    expect(w.failures[0]).to.match(/^ENOENT:\s/, '[0]')
  })

  it('should intercept exceptions', () => {
    let data, error
    w = new W({
      onError: function (e, d) {
        error = e
        data = d
        return DO_SKIP
      }
    })
    w.walkSync(process.cwd() + '/nope')
    expect(error.code).to.eql('ENOENT')
    expect(data).to.match(/nope$/)
    expect(w.failures).to.eql([])
  })
})
