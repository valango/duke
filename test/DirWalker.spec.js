'use strict'
const ME = 'DirWalker'

const { expect } = require('chai')
const _ = require('lodash')
const W = require('../src/' + ME)

let w, w2, options, context, count

class W2 extends W {
  processEntry (d) {
    let a = super.processEntry(d)
    if (d.type !== W.T_DIR) return W.DO_SKIP
    // console.log(a, d)
    if (d.name === 'node_modules') (context = d)
    return ++count > 4 ? W.DO_ABORT : a
  }
}

describe(ME, () => {
  beforeEach(() => {
    w = new W(options)
    w2 = new W2()
    w2.rules = w.rules = new W.RuleTree(null, 0)
    w.rules.add(['/node_modules', '.*'], W.DO_SKIP)
    // console.log('TREE', w.rules.tree)
    context = undefined
    count = 0
  })

  it('should construct w defaults', () => {
    expect(w.rules && typeof w.rules).to.equal('object')
  })

  it('should visit and register failure', () => {
    w = new W({ rules: null })
    w.process = (d) => {
      context = d
      ++count
      w.registerFailure('a', 'test')
      w.registerFailure(new Error('b'))
      return W.DO_ABORT
    }
    w.walk(process.cwd())
    expect(count).to.equal(1)
    expect(_.pick(context, ['action', 'dir', 'depth'])).to
      .eql({ action: W.NOT_YET, depth: 0, dir: '' })
    expect(w.failures).to.eql(['a\n  test', 'b'])
  })

  it('should process rules', () => {
    let cnt = 0
    w.add('/pack*.json', 0)
    w.process = ({ action }) => {
      ++count
      if (action === 0) ++cnt
      return action
    }
    w.walk(process.cwd())
    expect(cnt).to.equal(2)
    expect(count).to.gte(5)
  })

  it('should support inheritance', () => {
    w2.walk(process.cwd())
    expect(count).to.gte(3)
    expect(_.pick(context, ['action', 'dir', 'name'])).to
      .eql({ action: W.DO_SKIP, dir: '', name: 'node_modules' })
  })

  it('should register exceptions', () => {
    let data
    w.once(W.ErrorEvent, (e, d) => (data = d))
    w.walk(process.cwd() + '/nope')
    expect(data && data.instance).to.equal(w)
    expect(w.failures.length).to.eql(1)
    expect(w.failures[0]).to.match(/^ENOENT/)
  })

  it('should intercept exceptions', () => {
    let data
    w.once(W.ErrorEvent, (e, d) => (d.action = W.DO_ABORT) && (data = d))
    w.walk(process.cwd() + '/nope')
    expect(data && data.instance).to.equal(w)
    expect(w.failures).to.eql([])
  })
})
