'use strict'
const { T_DIR } = require('../..')

/**
 * Simulates how Ruler is used by Walker.
 *
 * @param {Ruler} rootRuler
 * @param {string} path - slash-delimited
 * @param {function(Ruler, number, string)} callback
 * @returns {Ruler}
 */
const run = (rootRuler, path, callback = undefined) => {
  const parts = path.split('/'), last = parts.length - 1
  let ruler = rootRuler, action = 0

  for (let i = 0, part; i <= last; i += 1) {
    if ((part = parts[i])) {
      action = ruler.check(part, i < last ? T_DIR : 0)
      if (callback) callback(ruler, action, part)
      ruler = ruler.clone(ruler.lastMatch)
    }
  }
  run.action = action
  return ruler
}

module.exports = run
