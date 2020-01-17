/**
 * @module DirWalker
 */
'use strict'
const ME = 'DirWalker'

const assert = require('assert').strict
const { EventEmitter } = require('events')
const { opendirSync } = require('fs')
const { join } = require('path')
const { inspect } = require('util')
const constants = require('./definitions')
/* eslint-disable */
const {
        DO_ABORT, NOT_YET, DO_SKIP,
        NIL,
        T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK
      } = constants
/* eslint-enable */

const ErrorEvent = ME + '-error'

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

class DirWalker extends EventEmitter {
  constructor (processor = undefined) {
    super()
    this.failures = null
    this.paths = []
    this.ruleIndex = NIL
    this.rules = null
    this.directory = undefined
    //  This method can be dynamically changed.
    this.process = processor || function (entryContext) {
      return this.processEntry(entryContext)
    }
  }

  closeDir () {
    if (this.directory) {
      this.directory.closeSync()
      this.directory = undefined
    }
    return this
  }

  handleError (error, context = undefined) {
    const d = { context, instance: this }
    this.emit(ErrorEvent, error, d)
    if (d.action !== undefined) {
      return d.action === DO_SKIP ? undefined : d.action
    }
    const comment = context &&
      (typeof context === 'string' ? context : inspect(context))
    this.registerFailure(error.message, comment)
  }

  match (type, name, ancestor) {
    if (!this.rules) return NOT_YET
    const res = this.rules.match(type, name, ancestor)
    if (res !== DO_SKIP) this.ruleIndex = this.rules.lastIndex
    return res
  }

  /**
   * To be overridden in derived classes.
   * @param entryContext
   * @returns {*}
   */
  processEntry (entryContext) {
    return entryContext
  }

  registerFailure (failure, comment = '') {
    let msg = typeof failure === 'string' ? failure : failure.message
    if (comment) msg += '\n  ' + comment
    this.failures.push(msg)
    return this
  }

  walk (rootDir) {
    const paths = this.paths
    assert(paths.length === 0, ME + '.walk() is not re-enterable')
    this.failures = []
    paths.push({ ancestor: NIL, dir: '' })

    while (paths.length) {
      const { ancestor, dir } = paths.shift()
      try {
        this.directory = opendirSync(join(rootDir, dir))
      } catch (error) {
        const r = this.handleError(error)
        if (r === DO_ABORT || r === DO_SKIP) return this
      }

      if (!this.directory) {
        continue                        //  There was an error.
      }
      let entry

      while ((entry = this.directory.readSync())) {
        const name = entry.name
        const type = getType(entry)

        const action = this.match(type, name, ancestor)
        const ultimate = this.process({ action, dir, name, type })

        if (ultimate === DO_ABORT) break

        if (type === T_DIR && ultimate !== DO_SKIP) {
          paths.push({
            ancestor: this.ruleIndex,   // Affected by matchRule()
            dir: join(dir, name)
          })
        }
      }
      this.closeDir()
    }
    return this
  }
}

Object.assign(DirWalker, { ErrorEvent, ...constants })
module.exports = DirWalker
