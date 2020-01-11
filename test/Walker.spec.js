'use strict'
const ME = 'Walker'

const { expect } = require('chai')
// const _ = require('lodash')
const Walker = require('../src/' + ME)

let dived, skipped, visited

const begin = ({ path }, context) => {
  context.dived.push(path.join('/'))
  return context
}

const visit = (type, name, { context, dirPath }) => {
  context.visited.push(dirPath + '/' + name)
  if (name[0] === '.' || ['node_modules', 'reports'].indexOf(name) >= 0) {
    context.skipped.push(dirPath + '/' + name)
    return Walker.SKIP
  }
}

describe(ME, () => {
  beforeEach(() => {
    (dived = []) && (visited = []) && (skipped = [])
  })

  it('should export constants', () => {
    expect(
      Object.keys(Walker).filter((k) => k.indexOf('T_') === 0).length
    ).to.equal(7)
  })

  it('should walk', () => {
    let w = new Walker(process.cwd(), { begin, visit })
    w.go({dived, skipped, visited})
    expect(dived.sort()).to.eql(['', 'examples', 'src', 'test'], 'dived')
    expect(skipped.indexOf('/node_modules')).to.gte(0, 'skipped')
    // expect(visited).to.eql([], 'visited')
  })
})
