'use strict'
const ME = 'helpers'

const { expect } = require('chai')
const { dirEntryTypeToLabel, T_FILE, T_DIR } = require('..')
const t = require('./toNativePath')
const relativize = require('../relativize')

describe(ME, () => {
  it('relativize', () => {
    expect(relativize(__filename, process.cwd(), '.')).to.eql(t('./test/helpers.spec.js'))
    expect(relativize(__filename, process.cwd())).to.eql(t('test/helpers.spec.js'))
    expect(relativize(__filename, '~')).to.match(/^~.+\.js$/)
    expect(relativize(__filename)).to.match(/^\w.+\.js$/)
    expect(relativize('x')).to.eql('x')
    expect(() => relativize(__filename, 'a', 'b')).to.throw('relativize() arguments conflict')
  })

  it('dirEntryTypeToLabel', () => {
    expect(() => dirEntryTypeToLabel({})).to.throw(Error, 'entry type', 'non-num')
    expect(() => dirEntryTypeToLabel(1.02)).to.throw(Error, 'entry type', 'non-int')
    expect(dirEntryTypeToLabel(T_FILE)).to.equal('file')
    expect(dirEntryTypeToLabel(T_FILE, true)).to.equal('files')
    expect(dirEntryTypeToLabel(T_DIR, true)).to.equal('directories')
  })
})
