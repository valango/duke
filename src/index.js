'use strict'

if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = 'development'

const inProduction = process.env.NODE_ENV === 'production'

/**
 * Package exports - members listed below and also the [constants]{@link constants.md}.
 * @namespace dwalker
 * @mixes constants
 */
const dwalker = {
  /** @see [Ruler]{@link Ruler.md} */
  Ruler: require('./Ruler'),
  /** @see [Walker]{@link Walker.md} */
  Walker: require('./Walker'),
  /** @see [loadFile]{@link utils.md#loadfilefilepath-mildly--undefined--buffer} */
  loadFile: require('./loadFile'),
  /** @see [relativize]{@link utils.md#relativizepath-rootpath-prefix--string--} */
  relativize: require('./relativize'),

  ...require('./constants')
}

if (!inProduction) dwalker.Ruler.prototype.dump = require('./dump')

module.exports = dwalker
