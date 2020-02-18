/**
 * @module run-ruler
 * @version 1.0.0
 */
'use strict'
const { T_DIR, T_FILE } = require('../..')


/**
 * Simulate how Ruler is used by Walker.
 *
 * @param {Ruler} ruler
 * @param {string} path - slash-delimited
 * @returns {Ruler}
 */
const run = (ruler, path) => {
  const parts = path.split('/'), last = parts.length - 1
  let r = ruler, action = 0

  for (let i = 0; i <= last; i += 1) {
    if (parts[i]) {
      if (i < last) {
        action = r.check(parts[i], T_DIR)
        r = r.clone(true)
        continue
      }
      action = r.check(parts[i], T_FILE)
    }
  }
  run.action = action
  return r
}

module.exports = run
