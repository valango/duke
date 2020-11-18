'use strict'

if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = 'development'

const constants = require('./src/constants')
const Ruler = require('./src/Ruler')
const Walker = require('./src/Walker')

if (process.env.NODE_ENV !== 'production') {
  Ruler.prototype.dump = require('./src/dumpRuler')
}

module.exports = { Ruler, Walker, ...constants }
