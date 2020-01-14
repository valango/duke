/**
 * @module DirWalker
 */
'use strict'
const ME = 'DirWalker'

const assert = require('assert').strict
const { opendirSync } = require('fs')
const { join } = require('path')

const NIL = -1

//  Action types - exported.
const A_NOPE = 0
const A_SKIP = 1
const A_EXCL = 2

//  DirEntry types - exported.
const T_BLOCK = 'bdev'
const T_CHAR = 'cdev'
const T_DIR = 'dir'
const T_FIFO = 'fifo'
const T_FILE = 'file'
const T_SOCKET = 'socket'
const T_SYMLINK = 'slink'

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
  throw new Error(ME + '.getType(): bad entry')
}

class DirWalker {
  constructor (processor = undefined) {
    this.failures = null
    this.paths = []
    this.ruleIndex = NIL
    //  This method can be dynamically changed.
    this.process = processor || function (entryContext) {
      return this.processEntry(entryContext)
    }
  }

  match (type, name, ancestor) {
    return A_NOPE
  }

  /**
   * To be overridden in derived classes.
   * @param entryContext
   * @returns {*}
   */
  processEntry (entryContext) {
    return entryContext
  }

  walk (rootDir) {
    const paths = this.paths
    assert(paths.length === 0, ME + '.walk() is not re-enterable')
    this.failures = []
    paths.push({ ancestor: NIL, dir: '' })

    while (paths.length) {
      const { ancestor, dir } = paths.shift()
      const directory = opendirSync(join(rootDir, dir))
      let entry

      while ((entry = directory.readSync())) {
        const name = entry.name
        const type = getType(entry)

        const action = this.match(type, name, ancestor)
        const ultimate = this.process({ action, dir, name, type })

        if (type === T_DIR && ultimate !== A_SKIP) {
          paths.push({
            ancestor: this.ruleIndex,   // Affected by matchRule()
            dir: join(dir, name)
          })
        }
      }
      directory.closeSync()
    }
  }
}

exports = module.exports = DirWalker

/* eslint-disable object-property-newline */
Object.assign(exports, {
  A_NOPE, A_SKIP, A_EXCL,
  T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK
})
