/**
 * @module Walker
 */
'use strict'
const ME = 'Walker'

const assert = require('assert')
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

/**
 * @typedef TClient <Object>
 *   @property {function(Object, Object=):*} [begin] - start with directory
 *   @property {function(string, string=, Object=):*} [visit] - visit a directory entry
 *   @property {function(Object, boolean)} [end]     - finalize with directory
 */
class Walker {
  /**
   * @param {string} rootDir
   * @param {TClient} client
   * @param {Object=} options
   * @param {Object=} fsApi   - replacement for Node.js internal 'fs', e.g. for testing.
   * @param {Object<{client:TClient, context:*}>} options
   */
  constructor (rootDir, client, options = {}, fsApi = undefined) {
    assert(rootDir && typeof rootDir === 'string',
      `${ME}: bad roodDir`)
    this.client = client
    this.failures = []
    this.maxEntries = options.maxEntries || 10000
    this._fs = fsApi || fs
    this._root = resolve(rootDir)
    this._seed = -1
  }

  get rootDir () {
    return this._root
  }

  go (context) {
    this.failures = []
    this._seed = -1
    this.walk_([], context)
    return this
  }

  fail_ (data) {
    this.failures.push(data)
  }

  walk_ (path, parentContext) {
    const dirId = ++this._seed
    /** @type {TClient} */
    const cli = this.client
    const dirPath = path.join(sep)
    const data = { dirId, dirPath, path, rootPath: this._root }
    let aborted = false, countDown = this.maxEntries
    let dir, dirEntry, res, type, toDive

    if (cli.begin && !(data.context = cli.begin(data, parentContext))) {
      return
    }

    try {
      dir = this._fs.opendirSync(join(data.rootPath, dirPath))
      toDive = []

      while (!aborted && (dirEntry = dir.readSync())) {
        if (--countDown < 0) {
          this.fail_(
            { message: format('%s: limit exceeded for \'%s\'', ME, dirPath) })
          aborted = true
          break
        }
        type = getType(dirEntry)

        if (cli.visit) {
          //  The following return values have special meaning:
          //  ABORT: ignore the rest of dirEntries, do not walk sub-directories.
          //  SKIP: do not walk this sub-directory (has no effect on non-directories).
          res = cli.visit(getType(dirEntry), dirEntry.name, data)
          if (!(aborted = res === ABORT) && type === T_DIR && res !== SKIP) {
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
    if (!aborted) {
      while (toDive[0]) {
        path.push(toDive.shift())
        this.walk_(path, data.context)
        path.pop()
      }
    }
    //  When aborted, the client may want to roll back something it did.
    cli.end && cli.end(data, aborted)
  }
}

exports = module.exports = Walker

Object.assign(exports,
  { ABORT, SKIP, T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK })
