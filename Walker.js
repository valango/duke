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
    this.failures.push(data)
  }

  walk_ (path, context) {
    const dirId = ++this._seed
    const cli = this.client
    const dir = types.isDirectory
    const dirPath = join(this._root, path.join(sep))
    let aborted = false, entries

    try {
      //  Todo: run the rest of the stuff directly under dir.read...()
      const dir = fs.opendirSync(dirPath)
      entries = []
      for (let entry; (entry = dir.readSync()); entries.push(entry)) {}
      dir.closeSync()
      entries = entries.map((e) => ({ name: e.name, type: getType(e) }))
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    } catch (e) {
      if (e.code === 'EBADF') return this.fail_(e)
      if (e.code === 'EACCES') return this.fail_(e)
      if (e.code === 'EPERM') return this.fail_(e)
      throw e
    }

    if (!cli.begin || cli.begin(
      { dirId, path, entries, context })) {
      if (cli.visit) {
        for (const entry of entries) {
          if (entry.skip) continue
          if (cli.visit({ dirId, context, path, ...entry }) === false) {
            aborted = true
            break
          }
        }
      }
      if (!aborted) {
        for (const entry of entries) {
          if (entry.skip || entry.type !== dir) continue
          this.walk_(path.concat(entry.name), context)
        }
      }
    }
    cli.end && cli.end({ dirId, path, context, aborted })
  }
}

exports = module.exports = Walker
exports.types = types
