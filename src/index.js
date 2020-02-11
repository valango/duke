'use strict'

if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = 'development'

const inProduction = process.env.NODE_ENV === 'production'

/**
 * Package exports - members listed below and also the constants.
 * @namespace dwalker
 * @mixes constants
 */
const dwalker = {
  /** @see {@link Ruler} */
  Ruler: require('./Ruler'),
  /** @see {@link Walker} */
  Walker: require('./Walker'),
  /** @see {@link actionName} */
  actionName: inProduction ? () => undefined : require('./actionname'),
  /** @see {@link loadFile} */
  loadFile: require('./load-file'),
  /** @see {@link relativize} */
  relativize: require('./relativize'),
  /** @see {@link typeName} */
  typeName: require('./typename'),

  ...require('./constants')
}

if (!inProduction) dwalker.Ruler.prototype.dump = require('./dump')

module.exports = dwalker
