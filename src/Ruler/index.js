'use strict'

const Ruler = require('./Ruler')

if (process.env !== 'production') {
  Ruler.prototype.dump = require('./dump')
} else {
  Ruler.prototype.dump = () => undefined
}

module.exports = Ruler
