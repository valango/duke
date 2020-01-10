/**
 * @module Walker
 */
'use strict'
const ME = 'Walker'
const assert = require('assert')
const { readdirSync } = require('fs')
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
  }

  go () {
    this.walk_([], this.context)
  }

  walk_ (path, context) {
    const cli = this.client
    const dir = types.isDirectory
    const dirPath = join(this._root, path.join(sep))
    let aborted = false
    let entries = readdirSync(dirPath, { withFileTypes: true })
      .map((e) => ({ name: e.name, type: getType(e) }))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))

    if (!cli.begin || (entries = cli.begin({path, entries, context}))) {
      if (cli.visit) {
        for (const entry of entries) {
          const { name, type } = entry
          if (cli.visit({ context, name, path, type }) === false) {
            aborted = true
            break
          }
        }
      }
      if (!aborted) {
        for (const entry of entries) {
          if (entry.type !== dir) continue
          this.walk_(path.concat(entry.name), context)
        }
      }
    }
    cli.end && cli.end({path, context, aborted})
  }
}

exports = module.exports = Walker
exports.types = types
