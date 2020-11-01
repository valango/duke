/**
 * @module stubs/fs/Dir
 * @version 1.0.0
 */
'use strict'

const checkType = require('../checkType')

const errClosed = () => {
  const error = new Error('Directory handle was closed')
  error.code = 'ERR_DIR_CLOSED'
  return error
}

class Dir {
  constructor (entries, path) {
    this._entries = entries
    this._path = path
    this._i = 0
  }

  get path () {
    return this._path
  }

  close (cb) {
    if (cb === undefined) {
      return new Promise((resolve, reject) => {
        this.close((error) => error ? reject(error) : resolve(undefined))
      })
    }
    checkType(cb, 'function', 'ERR_INVALID_CALLBACK')
    if (!this._entries) return cb(errClosed())
    this._entries = undefined
    setTimeout(() => cb(null), 2)
  }

  closeSync () {
    if (!this._entries) throw errClosed()
    this._entries = undefined
  }

  read_ () {
    const entry = this._entries[this._i]
    if (entry === undefined) return null
    this._i += 1
    return entry
  }

  read (cb) {
    if (cb === undefined) {
      return new Promise((resolve, reject) => {
        this.read((error, entry) => error ? reject(error) : resolve(entry))
      })
    }
    checkType(cb, 'function', 'ERR_INVALID_CALLBACK')
    if (!this._entries) return cb(errClosed())
    setTimeout(() => cb(null, this.read_()), 2)
  }

  readSync () {
    if (!this._entries) throw errClosed()
    return this.read_()
  }

  [Symbol.asyncIterator] () {
    return {
      next: () => {
        return new Promise((resolve, reject) => {
          this.read((error, value) => error
            ? reject(error) : resolve(value ? { value } : { done: true }))
        })
      }
    }
  }
}

module.exports = Dir
