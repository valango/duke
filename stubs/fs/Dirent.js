/**
 * @module stubs/fs/Dirent
 * @version 1.0.0
 */
'use strict'

const isFalse = () => false

const pDir = {
  isBlockDevice: isFalse,
  isCharacterDevice: isFalse,
  isDirectory: () => true,
  isFIFO: isFalse,
  isFile: isFalse,
  isSocket: isFalse
}

const pFile = {
  isBlockDevice: isFalse,
  isCharacterDevice: isFalse,
  isDirectory: isFalse,
  isFIFO: isFalse,
  isFile: () => true,
  isSocket: isFalse
}

const factory = (name, isDir = false) =>
  Object.create(isDir ? pDir : pFile, { name: { value: name } })

module.exports = factory
