/**
 * @module Walker
 */
'use strict'
const ME = 'Walker'
const assert = require('assert')
const { format } = require('util')
const fs = require('fs')
const { join, resolve, sep } = require('path')

const types = {
  isBlockDevice: 'BlockDevice',
  isCharacterDevice: 'CharacterDevice',
  isDirectory: 'Directory',
  isFIFO: 'FIFO',
  isFile: 'File',
  isSocket: 'Socket',
  isSymbolicLink: 'SymbolicLink'
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
 *   @property {function(string, string=, Object=):boolean} [visit] - visit a directory entry
 *   @property {function(Object, boolean)} [end]     - finalize with directory
 */
class Walker {
  /**
   *
   * @param {string} rootDir
   * @param {TClient} client
   * @param {Object=} options
   * @param {Object<{client:TClient, context:*}>} options
   */
  constructor (rootDir, client, options = {}) {
    assert(rootDir && typeof rootDir === 'string',
      `${ME}: bad roodDir`)
    this.client = client
    this.failures = []
    this.maxEntries = options.maxEntries || 10000
    this._root = resolve(rootDir)
    this._seed = -1
  }

  get rootDir () {
    return this._root
  }

  go (context = undefined) {
    this.failures = []
    this._seed = -1
    this.walk_([], context)
  }

  fail_ (data) {
    this.failures.push(data)
  }

  walk_ (path, parentContext) {
    const dirId = ++this._seed
    /** @type {TClient} */
    const cli = this.client
    const dirPath = path.join(sep)
    const data = {dirId, dirPath, path, rootPath: this._root}
    let aborted = false, countDown = this.maxEntries
    let dir, dirEntry

    if (cli.begin &&
      (data.context = cli.begin(data, parentContext)) === false) {
      return
    }

    try {
      dir = exports.fs.opendirSync(join(data.rootPath, dirPath))

      while (!aborted && (dirEntry = dir.readSync())) {
        if (--countDown < 0) {
          this.fail_(
            { message: format("%s: limit exceeded for '%s'", ME, dirPath) })
          aborted = true
          break
        }
        if (cli.visit) {
          if ((aborted = (cli.visit(getType(dirEntry), dirEntry.name, data)
            === false))) {
            break
          }
        }
        if (dirEntry.isDirectory()) {
          this.walk_(path.concat(dirEntry.name), data.context)
        }
      }
    } catch (e) {
      if (e.code === 'EBADF') return this.fail_(e)
      if (e.code === 'EACCES') return this.fail_(e)
      if (e.code === 'EPERM') return this.fail_(e)
      throw e
    } finally {
      if (dirEntry !== undefined) dir.closeSync()
    }
    //  When aborted, the client may want to roll back something it did.
    cli.end && cli.end(data, aborted)
  }
}

exports = module.exports = Walker
exports.fs = fs
exports.types = types
