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
const definitions = require('./definitions')
const RuleTree = require('./RuleTree')
/* eslint-disable */
const {
        DO_ABORT, NOT_YET, DO_SKIP,
        NIL,
        T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK
      } = definitions
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

const getType = (entry) => {
  for (const test of Object.keys(types)) {
    if (entry[test]()) return types[test]
  }
}

class DirWalker extends EventEmitter {
  constructor ({ processor, rules }) {
    super()
    this.failures = null
    this.paths = []
    this.rules = rules === undefined ? new RuleTree() : rules
    this.directory = undefined
    //  This method can be dynamically changed.
    this.process = processor || function (entryContext) {
      return this.processEntry(entryContext)
    }
  }

  add (rules, action = undefined) {
    this.rules.add(rules, action)
    return this
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

  match (type, name, parents) {
    if (!this.rules) return NOT_YET
    return this.rules.test(name, parents)
  }

  /**
   * To be overridden in derived classes.
   * @param entryContext
   * @returns {*}
   */
  processEntry ({action}) {
    return action
  }

  registerFailure (failure, comment = '') {
    let msg = typeof failure === 'string' ? failure : failure.message
    if (comment) msg += '\n  ' + comment
    this.failures.push(msg)
    return this
  }

  /**
   *  Process directory tree width-first starting from `rootDir`.
   *  If `rules` are defined, test these for ever directory entry
   *  and invoke `process` method.
   *
   * @param rootDir
   * @returns {DirWalker}
   */
  walk (rootDir) {
    const paths = this.paths
    assert(paths.length === 0, ME + '.walk() is not re-enterable')
    this.failures = []
    paths.push({ parents: [NIL], depth: 0, dir: '' })

    while (paths.length) {
      const { parents, depth, dir } = paths.shift(), length = paths.length
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

        const action = this.match(type, name, parents)
        const ultimate = this.process(
          { action, depth, dir, name, rootDir, type })

        if (ultimate === DO_ABORT) {
          paths.splice(length, length)
          break
        } else if (type === T_DIR && ultimate !== DO_SKIP) {
          paths.push({
            depth: depth + 1,
            dir: join(dir, name),
            parents: this.rules && this.rules.lastMatches
          })
        }
      }
      this.closeDir()
    }
    return this
  }
}

Object.assign(DirWalker, { ErrorEvent, ...definitions })
module.exports = DirWalker
