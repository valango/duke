/**
 * Find and process Node.js projects
 */
'use strict'

const { actionName, DO_ABORT, DO_SKIP } = require('../src/definitions')
const DirWalker = require('../src/DirWalker')
const RuleTree = require('../src/RuleTree')
const pt = require('path')
const { format } = require('util')

const actions = ['ADD_PROJECT']
const ADD_PROJECT = 0
// const ADD_IGNORE = 1
const projects = []
let nEntries = 0, maxDepth = 0
const bAllowHierarchy = false

const print = (...args) => process.stdout.write(format.apply(null, args) + '\n')
const roots = process.argv.slice(2)
const rules = new RuleTree(['node_modules', '.*'], DO_SKIP)
const processor = ({ action, depth, dir, name, rootDir, type }) => {
  ++nEntries && (maxDepth = Math.max(depth, maxDepth))
  if (action === ADD_PROJECT) {
    // print('FOUND:', pt.join(rootDir, dir))
    projects.push(pt.join(rootDir, dir))
    return bAllowHierarchy ? DO_SKIP : DO_ABORT
  }
  if (action >= 0) {
    print(actionName(action) || actions[action], dir, name, type)
  }
  return action
}
const walker = new DirWalker({ processor, rules })

rules.add('package.json', ADD_PROJECT)

if (!roots.length) roots.push('.')

const t0 = process.hrtime()

for (const root of roots) {
  walker.walk(pt.resolve(root))
}
const t1 = process.hrtime(t0)
const t = t1[0] * 1e9 + t1[1], v = Math.floor(t / nEntries)

if (walker.failures.length) {
  walker.failures.forEach((f) => print(f))
  print('Total %i failures', walker.failures.length)
}

print('Total %i projects', projects.length)
print(
  'Total %i nanoseconds (%i ns per item) spent on %i entries, maximum directory depth: %i',
  t, v, nEntries, maxDepth)
