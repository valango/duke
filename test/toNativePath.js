'use strict'

const { sep } = require('path')

//  Converts the `path` to OS - specific one.
module.exports = sep === '/' ? path => path : path => path.replace(/(\/)/g, sep)
