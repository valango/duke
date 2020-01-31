/**
 * @module index
 */
'use strict'

if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = 'development'

/**
 * @type {Object<{Ruler, Walker, actionName:function(), typeName:function()}>}
 */
module.exports = {
  Walker: require('./Walker'),
  Ruler: require('./Ruler'),
  loadFile: require('./load-file'),
  ...require('./definitions')
}
