'use strict'

if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = 'development'

const inProduction = process.env.NODE_ENV === 'production'
const noop = () => undefined

const Walker = require('./Walker')
const Ruler = require('./Ruler')

if (!inProduction) Ruler.prototype.dump = require('./dump')

const actionName = inProduction ? noop : require('./actionname')
const typeName = require('./typename')
const loadFile = require('./load-file')
const relativize = require('./relativize')

/**
 * Package exports - members listed below and also all constants.
 * @namespace {Object} dwalker
 * @mixes constants
 */
const dwalker = {
  /** @type {Ruler} */
  Ruler,
  /** @type {Walker} */
  Walker,
  /** Does nothing in production mode!
   *  @see {@link actionName}
   *  @type {function(...):string} */
  actionName,
  /** @see {@link loadFile}
   *  @type {function(...):string} */
  loadFile,
  /** @see {@link relativize}
   *  @type {function(...):string} */
  relativize,
  /** @see {@link typeName}
   *  @type {function(...):string} */
  typeName,
  /** constants */
  ...require('./constants')
}

module.exports = dwalker
