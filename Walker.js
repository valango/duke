/**
 * @module Walker
 */
'use strict'
const ME = 'Walker'
const assert = require('assert')
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
 *   @property {function(Object):boolean} visit - visit a directory entry
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
    this._root = resolve(rootDir)
    this.client = options.client
    this.context = options.context
    this._seed = -1
    this.failures = []
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
    data.message += ' @' + debugLocus
    this.failures.push(data)
  }

  walk_ (path, context) {
    const dirId = ++this._seed
    /** @type {TClient} */
    const cli = this.client
    let aborted = false, dir, entry

    if (cli.begin && cli.begin({ dirId, path, context }) === false) return

    try {
      dir = fs.opendirSync(join(this._root, path.join(sep)))

      while (!aborted && (entry = dir.readSync())) {
        if (cli.visit) {
          if ((aborted =
            (cli.visit({
              context,
              dirId,
              entry,
              name: entry.name,
              path,
              type: getType(entry)
            }) === false))) {
            break
          }
        }
        if (entry.isDirectory()) {
          this.walk_(path.concat(entry.name), context)
        }
      }
    } catch (e) {
      if (e.code === 'EBADF') return this.fail_(e)
      if (e.code === 'EACCES') return this.fail_(e)
      if (e.code === 'EPERM') return this.fail_(e)
      throw e
    } finally {
      if (entry !== undefined) dir.closeSync()
    }
    cli.end && cli.end({ dirId, path, context, aborted })
  }
}

exports = module.exports = Walker
exports.types = types
