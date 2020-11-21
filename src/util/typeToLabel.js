'use strict'
const labels = '? file directory symlink blockDevice charDevice socket fifo'.split(' ')
const { T_DIR } = require('../constants')
const checkDirEntryType = require('./checkEntryType')

/**
 * Translate directory entry type to descriptive label.
 * @param {TEntryType} type
 * @param {boolean=} plural
 * @returns {string}
 */
module.exports = (type, plural = false) => {
  let label = labels[checkDirEntryType(type)]

  if (plural) {
    label = type === T_DIR ? 'directories' : label + 's'
  }
  return label
}
