/**
 * Simple driver for debugging - not much a demo.
 */
'use strict'

const HELP = 'Count all files and subdirectories, excluding nothing.'

const RuleTree = require('../src/RuleTree')
const { parseCl, print } = require('./util')

const args = parseCl({}, HELP)
const tree = new RuleTree(args).dump()

forEach(tree, (node, i) => print('%s: %O', (i + '').padStart(2), node))
