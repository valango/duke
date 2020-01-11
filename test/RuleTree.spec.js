'use strict'
const ME = 'RuleTree'

const { expect } = require('chai')
const _ = require('lodash')
const RuleTree = require('../src/' + ME)

describe(ME, () => {
  it('should construct', () => {
    const t = new RuleTree(['a/b', 'a/c/', 'file'])
    const r = t.match(undefined, 'a')
    expect(r.length).to.eql(1, 'r.length')
    expect(r[0].i).to.eql(3, 'r.length')
  })
})
