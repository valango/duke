/**
 * @module examples/walking
 * For playing around with Walker and Ruler.
 */

/* eslint-disable */
'use strict'
// const { getSystemErrorName } = require('util')
const { DO_ABORT, DO_SKIP, loadFile, Ruler, Walker } = require('..')

//  File system simulation.
/* const fsys = {
  dir1: {
    dir2: {},
    'package.json': '{}'
  }
} */
const FILES = 1
const DIRS = 2

const defaultRules = [
  DO_SKIP, 'node_modules', '.*'
]

const projectRules = [
  DO_ABORT, '*.html',
  DO_SKIP, '/node_modules/', '.*',
  FILES, 'item*.txt',
  DIRS, '*/', '!*skipped/'
]

const walker = new Walker()
walker.defaultRuler = new Ruler(defaultRules)
walker.projectRuler = new Ruler(projectRules)

const run = () => {
  const res = walker.walk(process.cwd())
  return res.then(r => console.log('R', r)).catch(e => console.log('E', e))
}

run()
