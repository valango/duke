'use strict'
const ME = 'RuleTree'

const { expect } = require('chai')
// const _ = require('lodash')
const RuleTree = require('../src/' + ME)
const { NIL } = RuleTree

describe(ME, () => {
  it('should construct', () => {
    const t = new RuleTree(['a/b', 'a/c/', 'file'])
    const d = t.dump()
    //  console.log('DUMP', d)
    expect(d.map(([p]) => p)).to.eql([NIL, 0, 0, NIL, 3], 'dump')
    expect(t.inspect(0)).to.eql([NIL, '^a\\/$', 0])
    expect(() => t.inspect(10)).to.throw(TypeError, 'not iterable')
  })

  it('should match', () => {
    const t = new RuleTree(['a/b', 'a/c/', 'file'])
    expect(t.match(NIL, 'a')).to.eql([3], 'a')
    expect(t.match(NIL, 'a/')).to.eql([0], 'a/')
  })
})
