/**
 * @module index
 */
'use strict'

/**
 * @type {Object<{Ruler, Walker, actionName:function(), typeName:function()}>}
 */
module.exports = {
  Walker: require('./Walker'),
  Ruler: require('./Ruler'),
  loadFile: require('./load-file'),
  ...require('./definitions')
}
