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
    // console.log('DUMP', d)
    expect(d.map(([p]) => p)).to.eql([NIL, 0, 0, NIL, 3], 'dump')
  })

  it('should match', () => {
    const t = new RuleTree(['a/b', 'a/c/', 'file'])
    expect(t.match(NIL, 'a')).to.eql([3], 'a')
    expect(t.match(NIL, 'a/')).to.eql([0], 'a/')
  })
})
