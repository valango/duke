/**
 * Stub for fs.opendir(), fs.opendirSync() and fs.promises.opendir().
 * @module stubs/fs/openDir
 * @version 1.0.0
 */
'use strict'
const checkType = require('./checkType')
const { checkDirNode, getNode, mkEntry } = require('./getNode')
const Dir = require('./Dir')

const factory = (tree, namespace = undefined /* , failures */) => {
  const ns = namespace || { promises: {} }

  //  https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fs_opendirsync_path_options
  const opendirSync = (path /*, options */) => {
    const { node } = getNode(tree, path), entries = []

    checkDirNode(node, path)

    for (const key of Reflect.ownKeys(node)) {
      entries.push(mkEntry(node[key], key))
    }
    return new Dir(entries, path)
  }

  //  https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fs_opendir_path_options_callback
  const opendir = (path, options, callback) => {
    const cb = (callback === undefined) ? options : callback

    checkType(cb, 'function', 'ERR_INVALID_CALLBACK')

    setTimeout(() => {
      try {
        const dir = opendirSync(path)
        cb(null, dir)
      } catch (error) {
        cb(error)
      }
    }, 5)
  }

  //  https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fspromises_opendir_path_options
  ns.promises.opendir = (path, options = undefined) => {
    return new Promise((resolve, reject) => {
      opendir(path, options, (error, data) => error ? reject(error) : resolve(data))
    })
  }

  return Object.assign(ns, { opendir, opendirSync })
}

module.exports = factory
