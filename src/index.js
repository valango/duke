/**
 * @module index
 */
'use strict'

/**
 * @type {Object}
 */
module.exports = {
  DirWalker: require('./DirWalker'),
  RuleTree: require('./RuleTree'),
  loadFile: require('./load-file'),
  ...require('./definitions')
}
