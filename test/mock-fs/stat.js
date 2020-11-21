'use strict'

const { resolve } = require('path')
const { T_SYMLINK } = require('../..')
const { getNode, mkEntry } = require('./getNode')

module.exports = (tree, ns) => {
  /* const doEntry = path => {
    const { key, node } = getNode(tree, path)
    return mkEntry(node, key)
  } */

  const realpath_ = path => {
    const { dir, key, node } = getNode(tree, path)

    if (node[1] !== T_SYMLINK) return { key, res: path, node }
    const r = { key, res: resolve(dir.slice(0, -1).join('/'), node[0]), node }
    if (getNode(tree, r.res)) return r
  }

  const realpathSync = path => realpath_(path).res

  const statSync = path => {
    const { key, res, node } = realpath_(path)
    if (node[1] !== T_SYMLINK) return mkEntry(node, key)
    const r = realpath_(res)
    return mkEntry(r.node, r.key)       //  NB: we don't check for loops here!
  }

  const realpath = path => {
    try {
      return Promise.resolve(realpathSync(path))
    } catch (error) {
      return Promise.reject(error)
    }
  }

  const stat = path => {
    try {
      return Promise.resolve(statSync(path))
    } catch (error) {
      return Promise.reject(error)
    }
  }

  Object.assign(ns.promises, { realpath, stat })

  return Object.assign(ns, { realpathSync, statSync })
}
