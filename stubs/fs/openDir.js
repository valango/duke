/**
 * Stub for fs.opendir(), fs.opendirSync() and fs.promises.opendir().
 * @module stubs/fs/openDir
 * @version 1.0.0
 */
'use strict'
const { getSystemErrorName } = require('util')
const checkType = require('../checkType')
const Dir = require('./Dir')
const dirEntry = require('./Dirent')

const ENOENT = 'no such file or directory'

const fail = (msg, errno, path) => {
  const code = getSystemErrorName(errno), syscall = 'opendir'
  let message = `${msg}, ${syscall}`

  if (path) message += ` '${path}'`

  throw Object.assign(new Error(message), { code, errno, path, syscall })
}

const factory = (tree /* , failures */) => {
  //  https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fs_opendirsync_path_options
  const opendirSync = (path /*, options */) => {
    checkType(path, 'string', 'ERR_INVALID_ARG_TYPE', 'path')

    const parts = path.split('/'), entries = []
    let node = tree, value

    for (let i = 0, item; (item = parts[i]) !== undefined; ++i) {
      if (item) {
        if (i === 0) {  //  Only absolute paths here!
          fail(ENOENT, -2, item)
        }
        if ((node = node[item]) === undefined) {
          fail(ENOENT, -2, parts.slice(0, i + 1).join('/'))
        }
        if (node && typeof node !== 'object') {
          fail('not a directory', -20, parts.slice(0, i + 1).join('/'))
        }
      }
    }

    for (const name of Reflect.ownKeys(node)) {
      const isDir = ((value = node[name]) && typeof value === 'object')
      entries.push(dirEntry(name, isDir))
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
  const promises = {
    opendir: (path, options = undefined) => {
      return new Promise((resolve, reject) => {
        opendir(path, options, (error, data) => error ? reject(error) : resolve(data))
      })
    }
  }

  return { opendir, opendirSync, promises }
}

module.exports = factory
