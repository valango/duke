/**
 * @module index
 */
'use strict'

if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = 'development'

const inProduction = process.env.NODE_ENV === 'production'
const noop = () => undefined

const Walker = require('./Walker')
const Ruler = require('./Ruler')

Ruler.prototype.dump = inProduction ? noop : require('./dump')

const actionName = inProduction ? noop : require('./actionname')
const loadFile = require('./load-file')

/**
 * @type {Object<{Ruler, Walker, actionName:function(), typeName:function()}>}
 */
module.exports = {
  Ruler, Walker, actionName, loadFile, ...require('./definitions')
}
