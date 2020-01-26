'use strict'

/**
 * @param {function()} task
 * @returns {Promise<number>} duration of `task` in microseconds.
 */
module.exports = (task) => {
  const t0 = process.hrtime()

  const finish = (result) => {
    const t1 = process.hrtime(t0)
    result.time = (t1[0] * 1e9 + t1[1]) / 1000
    return result
  }

  return Promise.resolve(task()).then(finish).catch(finish)
}
