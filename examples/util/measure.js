'use strict'

const start = () => process.hrtime()

const finish = (t0) => {
  const t1 = process.hrtime(t0)
  return (t1[0] * 1e9 + t1[1]) / 1000
}

/**
 * @param {function()} task
 * @returns {Promise<number>} duration of `task` in microseconds.
 */
exports = module.exports = (task) => {
  const t0 = process.hrtime()

  const finish = (result) => {
    const t1 = process.hrtime(t0)
    result.time = (t1[0] * 1e9 + t1[1]) / 1000
    return result
  }

  return Promise.resolve(task()).then(finish).catch(finish)
}

exports.start = start
exports.finish = finish
