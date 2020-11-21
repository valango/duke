'use strict'
const { T_DIR, T_FILE } = require('../..')

/**
 * Simulates how Ruler is used by Walker.
 *
 * @param {Ruler} ruler
 * @param {string} path - slash-delimited
 * @param cb
 * @returns {Ruler}
 */
const run = (ruler, path, cb = undefined) => {
  const parts = path.split('/'), last = parts.length - 1
  let r = ruler, action = 0

  for (let i = 0, part; i <= last; i += 1) {
    if ((part = parts[i])) {
      if (i < last) {
        action = r.check(part, T_DIR)
        if (cb) cb(r, action, part)
        r = r.clone(r.lastMatch)
        continue
      }
      action = r.check(part, T_FILE)
    }
  }
  run.action = action
  return r
}

module.exports = run
