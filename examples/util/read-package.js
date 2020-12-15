'use strict'

const { readFile } = require('fs').promises
const { join } = require('path')

/**
 *
 * @param {string} dirPath
 * @returns {Promise<Object{error, json}>}
 */
module.exports = async (dirPath) => {
  const data = {}

  return readFile(join(dirPath, 'package.json')).then(buffer => {
    data.read = buffer + ''
    data.json = JSON.parse(data.read)
    return data
  }).catch(error => {
    if (error.code !== 'ENOENT') {
      if (data.read) error.code = 'SYNTAX'
      data.error = error
    }
    return data
  })
}

// module.exports = readPackage
