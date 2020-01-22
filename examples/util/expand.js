/**
 * @module expand
 */
'use strict'

const { opendirSync } = require('fs')
const { join } = require('path')

/**
 * Expand every 'path/*' to all sub-dirs of the path.
 * @param {Array<string>} args
 * @returns {Array<string>}
 */
module.exports = (args) => {
  const res = []

  for (const path of args) {
    if (!/\/\*$/.test(path)) {
      res.push(path)
      continue
    }
    const p = path.substring(0, path.length - 2), dir = opendirSync(p)
    let entry
    while ((entry = dir.readSync())) {
      if (!entry.isDirectory()) continue
      if (entry.name[0] !== '.') res.push(join(p, entry.name))
    }
    dir.closeSync()
  }
  return res
}
