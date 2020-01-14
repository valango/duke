'use strict'
const ME = 'Walker'

const { expect } = require('chai')
const Walker = require('../src/' + ME)

let dived, skipped, visited, e0, e1

const begin = ({ path }, context) => {
  context.dived.push(path.join('/'))
}

const b1 = ({ path, setContext }, context) => {
  context.dived.push(path.join('/'))
  if (path.length === 1 && path[0] === 'examples') {
    //  NB: new end will be called in subdirs as well... so adjust counters
    setContext({ end: () => ++e1 })
  }
}

const visit = (type, name, { dirPath }, context) => {
  context.visited.push(dirPath + '/' + name)
  if (name[0] === '.' || ['node_modules', 'reports'].indexOf(name) >= 0) {
    context.skipped.push(dirPath + '/' + name)
    return Walker.SKIP
  }
}

const end = () => ++e0

xdescribe(ME, () => {
  beforeEach(() => {
    (dived = []) && (visited = []) && (skipped = [])
    e0 = e1 = 0
  })

  it('should export constants', () => {
    expect(
      Object.keys(Walker).filter((k) => k.indexOf('T_') === 0).length
    ).to.equal(7)
  })

  it('should walk', () => {
    const w = new Walker(process.cwd())
    w.go({ begin, end, visit, dived, skipped, visited })
    expect(dived.sort().slice(0, 2)).to.eql(['', 'examples'])
    expect(skipped.indexOf('/node_modules')).to.gte(0, 'skipped')
    expect(e0).to.eql(dived.length, 'e0')
  })

  it('should manipulate context', () => {
    const w = new Walker(process.cwd())
    w.go({ begin: b1, end, visit, dived, skipped, visited })
    expect(e0).to.eql(dived.length, 'e0')
    expect(e1).to.eql(1, 'e1')
  })
})
