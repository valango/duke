/**
 * @module examples/util/duration
 */
'use strict'

/**
 * @param {function()} task
 * @returns {number} duration of `task` in microseconds.
 */
module.exports = (task) => {
  const t0 = process.hrtime()

  task()

  const t1 = process.hrtime(t0)
  return (t1[0] * 1e9 + t1[1]) / 1000
}
