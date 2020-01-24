/**
 * @module index
 */
'use strict'

/**
 * @type {Object}
 */
module.exports = {
  DirWalker: require('./Walker'),
  RuleTree: require('./Ruler'),
  loadFile: require('./load-file'),
  ...require('./definitions')
}
