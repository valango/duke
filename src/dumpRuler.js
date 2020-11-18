'use strict'
const { format, formatWithOptions } = require('util')

/**
 * Create diagnostic dump.
 * @param {Array<string>|string|number=} options which members to show and how.
 * @param {Object|boolean=} options for native `util.inspect()`.
 * @returns {string}
 */
module.exports = function dump (options = true) {
  let mask = '_ancestors sincereId tree'.split(' ')
    .concat(Object.keys(this).filter(k => k[0] !== '_'))

  const w = Math.max.apply(null, mask.map(m => m.length))

  let opts = options, indexes = []
  const tree = this._tree.slice()
  const rw = tree.map(([, r]) => format('%O', r).length)

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

  const rm = Math.max.apply(0, rw)

  const dumpNode = (i) => {
    const [t, r, p, a] = tree[i]
    return formatWithOptions(opts, '%s: %O %O,%s%O, %O',
      (i + '').padStart(w), (t || ' '),
      r, ''.padStart(rm - rw[i] + 4 - (p + '').length), p, a)
  }
  const res = indexes.map((i) => dumpNode(i))

  mask.sort().forEach((key) => {
    res.push(formatWithOptions(opts, '%s: %O', key.padStart(w), this[key]))
  })
  return res.join(',\n') + '\n'
}
