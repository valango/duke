/**
 * @module Walker
 */
'use strict'
const ME = 'Walker'

const assert = require('assert').strict
const clone = require('lodash.clone')
const fs = require('fs')
const { join, resolve, sep } = require('path')
const { format } = require('util')

//  Special return values from visit() client method - exported.
const ABORT = -1
const SKIP = -2

//  DirEntry types - exported.
const T_BLOCK = 'blockDevice'
const T_CHAR = 'characterDevice'
const T_DIR = 'directory'
const T_FIFO = 'fifo'
const T_FILE = 'file'
const T_SOCKET = 'socket'
const T_SYMLINK = 'symLink'

const M_LIMIT = '%s: %i directory entries limit exceeded for \'%s\''

const types = {
  isBlockDevice: T_BLOCK,
  isCharacterDevice: T_CHAR,
  isDirectory: T_DIR,
  isFIFO: T_FIFO,
  isFile: T_FILE,
  isSocket: T_SOCKET,
  isSymbolicLink: T_SYMLINK
}

const tests = Object.keys(types)

const getType = (entry) => {
  for (const test of tests) {
    if (entry[test]()) return types[test]
  }
}

class Walker {
  /**
   * @param {string} rootDir
   * @param {Object=} options
   */
  constructor (rootDir, options = {}) {
    assert(rootDir && typeof rootDir === 'string',
      `${ME}: bad roodDir`)
    this.failures = []
    this.maxEntries = options.maxEntries || 10000
    this._stack = []
    this._root = resolve(rootDir)
    this._seed = -1
  }

  get rootDir () {
    return this._root
  }

  go (rootContext) {
    const context = rootContext || {}, stack = this._stack
    assert(stack.length === 0, 'Walker.go() is not multi-threading')
    stack.push(context)
    this.failures = []
    this._seed = -1
    this.walk_([])
    return this
  }

  fail_ (data) {
    this.failures.push(data)
  }

  walk_ (path) {
    const stack = this._stack, length = stack.length
    const dirId = ++this._seed, dirPath = path.join(sep), toDive = []
    const data = { dirId, dirPath, path, rootPath: this._root }
    let sp = length - 1, context = stack[sp]
    let wasAborted = false, countDown = this.maxEntries
    let dir, dirEntry, res, type

    data.setContext = (values) => {
      if (!Object.keys(values).some((k) => values[k] !== context[k])) return
      if (sp === (length - 1)) {
        sp = stack.push(context = clone(context)) - 1
      }
      Object.assign(context, values)
    }

    if (context.begin && context.begin(data, context) === SKIP) {
      return
    }

    try {
      dir = fs.opendirSync(join(data.rootPath, dirPath))

      while (!wasAborted && (dirEntry = dir.readSync())) {
        if (--countDown < 0) {
          this.fail_({ message: format(M_LIMIT, ME, this.maxEntries, dirPath) })
          wasAborted = true
          break
        }
        type = getType(dirEntry)

        if (context.visit) {
          //  The following return values have special meaning:
          //  ABORT: ignore the rest of dirEntries, do not walk sub-directories.
          //  SKIP: do not walk this sub-directory (has no effect on non-directories).
          res = context.visit(getType(dirEntry), dirEntry.name, data, context)
          if (!(wasAborted = res === ABORT) && type === T_DIR && res !== SKIP) {
            toDive.push(dirEntry.name)
          }
        }
      }
    } catch (e) {
      if (e.code === 'EBADF') return this.fail_(e, path)
      if (e.code === 'EACCES') return this.fail_(e, path)
      if (e.code === 'EPERM') return this.fail_(e, path)
      throw e
    } finally {
      if (dirEntry !== undefined) dir.closeSync()
    }
    if (!wasAborted) {
      while (toDive[0]) {
        path.push(toDive.shift())
        this.walk_(path, data.context)
        path.pop()
      }
    }
    //  When aborted, the client may want to roll back something it did.
    delete data.setContext
    data.wasAborted = wasAborted
    //  If `end` method was changed via setContext(), call possibly both.
    const thisEnd = context.end
    thisEnd && context.end(data, context)
    while (stack.length > length) stack.pop()
    context = stack[length - 1]
    if (context.end && context.end !== thisEnd) {
      context.end(data, context)
    }
  }
}

exports = module.exports = Walker

Object.assign(exports,
  { ABORT, SKIP, T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK })
