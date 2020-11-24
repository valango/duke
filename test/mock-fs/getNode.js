'use strict'
const assert = require('assert-fine')
const { T_DIR, T_FILE } = require('../..')
const checkType = require('./checkType')
const dirEntry = require('./Dirent')

const messages = { ENOENT: 'no such file or directory', ENOTDIR: 'not a directory' }
const numbers = { ENOENT: -2, ENOTDIR: -20 }  //  Windows codes may differ!

const fail = (code, path) => {
  const errno = numbers[code], syscall = 'opendir'
  let message = `${messages[code]}, ${syscall}`

  if (path) message += ` '${path}'`

  throw Object.assign(new Error(message), { code, errno, path, syscall })
}

const checkDirNode = (node, path) => {
  if (!(node && typeof node === 'object' && !Array.isArray(node))) {
    const p = typeof path === 'string' ? path : path.join('/')
    fail('ENOTDIR', p)
  }
  return node
}

/**
 * Get FS simulation tree node by given path.
 * @param {Object} tree
 * @param {string} path
 * @returns {Object}
 */
const getNode = (tree, path) => {
  checkType(path, 'string', 'ERR_INVALID_ARG_TYPE', 'path')

  const parts = path.split('/'), dir = ['']
  let node = tree, key

  for (let i = 0, item; (item = parts[i]) !== undefined; ++i) {
    checkDirNode(node, parts.slice(0, i + 1))

    if (item) {
      if (i === 0) {  //  Only absolute paths here!
        fail('ENOENT', item)
      }
      if ((node = node[item]) === undefined) {
        fail('ENOENT', parts.slice(0, i + 1).join('/'))
      }
      dir.push(item)
      key = item
    }
  }
  return { dir, key, node }
}

const mkEntry = (node, key) => {
  assert(node && typeof node === 'object', `bad node [${key}]`)
  const isA = Array.isArray(node), type = isA ? node[1] || T_FILE : T_DIR
  assert(!(isA && type === T_DIR), `illegal T_DIR [${key}]`)
  return dirEntry(key, type)
}

module.exports = { checkDirNode, getNode, mkEntry }
