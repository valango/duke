/**
 * @module tree
 * @version 1.0.0
 */
'use strict'
// const ME = 'tree'
const RuleTree = require('../src/RuleTree')

const t = new RuleTree(['a/b', 'a/c/', 'file'])

let v = t.match(undefined, 'a')
v = 0
