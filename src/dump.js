/**
 * @module Ruler/dump
 */
'use strict'
const { format, formatWithOptions } = require('util')
const actionName = require('./actionname')

/**
 * Create diagnostic dump.
 * @param {Array<string>|string|number=} mask which members to show.
 * @param {Object|boolean=} options for native `util.inspect()`.
 * @returns {string}
 */
module.exports = function dump (options = true) {
  let w = 0
  let mask = Object.keys(this).concat('sincereId', 'tree')
    .filter((k) => k[0] !== '_' && ((k.length > w && (w = k.length)) || k))

  let opts = options, indexes = []
  const tree = this._tree.slice()
  const rw = tree.map(([, r]) => format('%O', r).length)
  const rm = Math.max.apply(0, rw)

  const dumpNode = (i) => {
    const [t, r, p, a] = tree[i]
    return formatWithOptions(opts, '%s: %O %O,%s%O, %O',
      (i + '').padStart(w), t.padStart(2),
      r, ''.padStart(rm - rw[i] + 4 - (p + '').length), p, actionName(a))
  }

  if (opts) {
    if (typeof opts === 'string') {
      mask = opts.split(/\W+/g)
    } else if (typeof opts === 'number') {
      mask = [opts]
    } else if (Array.isArray(opts)) {
      mask = opts
    }
    opts = { colors: true }
  } else {
    opts = {}
  }

  mask.forEach((key, i) => {
    if (typeof key === 'number') {
      indexes.push(key)
    } else if (key === 'tree') {
      indexes = tree.map((v, j) => j)
    } else {
      return
    }
    mask.splice(i, 1)
  })

  const res = indexes.map((i) => dumpNode(i))

  mask.sort().forEach((key) => {
    let val = this[key]
    if (key === 'ancestors') {
      val = val && val.map(([, i]) => i)
    } else if (key.indexOf('Action') >= 0) val = actionName(val)
    res.push(formatWithOptions(opts, '%s: %O', key.padStart(w), val))
  })
  return res.join(',\n') + '\n'
}
