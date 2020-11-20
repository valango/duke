'use strict'

const assert = require('assert-fine')
const { T_FILE, T_FIFO } = require('../constants')

module.exports = (type) => {
  assert(type >= T_FILE && type <= T_FIFO && (type % 1) === 0,
    () => `illegal entry type '${type}'`)
  return type
}
