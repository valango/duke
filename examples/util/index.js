'use strict'

module.exports = {
  dump: require('./dump'),
  dumpFailures: require('./dumpFailures'),
  expand: require('./expand'),
  /** @type {function(Walker):Walker} */
  leaksTrap: require('./leaksTrap'),
  parseCl: require('./parse-cl'),
  /** @type {function(...*):boolean} */
  print: require('./print')
}
