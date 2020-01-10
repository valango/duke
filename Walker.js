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

let debugLocus

/**
 * @typedef TClient <Object>
 *   @property {function(Object):boolean} begin - start with directory
 *   @property {function(string, string, Object):boolean} visit - visit a directory entry
 *   @property {function(Object):boolean} end   - finalize with directory
 */
class Walker {
  /**
   *
   * @param {string} rootDir
   * @param {Object<{client:TClient, context:*}>} options
   */
  constructor (rootDir, options) {
    assert(rootDir && typeof rootDir === 'string',
      `${ME}: bad roodDir`)
    this.client = options.client
    this.context = options.context
    this.failures = []
    this.maxEntries = options.maxEntries || 10000
    this._root = resolve(rootDir)
    this._seed = -1
  }

  get rootDir () {
    return this._root
  }

  go () {
    this.failures = []
    this._seed = -1
    this.walk_([], this.context)
  }

  fail_ (data) {
    if (debugLocus) data.message += ' @' + debugLocus
    this.failures.push(data)
  }

  walk_ (path, parentContext) {
    const dirId = ++this._seed
    /** @type {TClient} */
    const cli = this.client
    let context = parentContext
    let aborted = false, dir, dirEntry, countDown = this.maxEntries

    if (cli.begin &&
      (context = cli.begin({ dirId, path, context }) === false)) {
      return
    }

    try {
      const dirPath = path.join(sep)
      dir = exports.fs.opendirSync(join(this._root, dirPath))

      while (!aborted && (dirEntry = dir.readSync())) {
        if (--countDown < 0) {
          this.fail_(
            { message: format("%s: limit exceeded for '%s'", ME, dirPath) })
          aborted = true
          break
        }
        if (cli.visit) {
          if ((aborted = (cli.visit(dirEntry.name, getType(dirEntry),
            { context, dirEntry, dirId, path }) === false))) {
            break
          }
        }
        if (dirEntry.isDirectory()) {
          this.walk_(path.concat(dirEntry.name), context)
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
    cli.end && cli.end({ dirId, path, context, aborted })
  }
}

exports = module.exports = Walker
exports.fs = fs
exports.types = types
