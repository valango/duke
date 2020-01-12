/**
 * @module gitignore
 */
'use strict'
// const ME = 'gitignore'

const { inspect, format } = require('util')
const RuleTree = require('../src/RuleTree')
const Walker = require('../src/Walker')
const { GLOB, TERM, TERM_EX } = RuleTree
const {
        // ABORT,
        SKIP,
        T_DIR,
        T_FILE,
        T_SYMLINK
      } = Walker

const ignoreList = [
  '*.tmp',
  '/test/*.js',
  '.*',
  '!test/Rule*.js',
  'node_modules'
]

const print = (...args) => process.stdout.write(format.apply(null, args) + '\n')

let files = [], dirs = [], links = [], ign = [], balance = 0

// { dirId, dirPath, path, rootPath }, parentContext
const begin = ({ dirId, dirPath, path }, context) => {
  dirs.push(dirPath) && ++balance
  const { savedParents, toIgnore } = context
  const m = toIgnore.match(path[path.length - 1] + '/')
  //  If the directory name matches any rule, we need to remember it.
  while (m.length) {
    const { index, rule } = m.shift()
    if (rule === GLOB) continue
    savedParents[dirId] = toIgnore.parent
    toIgnore.parent = index
    console.log('BEG_' + dirId, path, savedParents)
    break
  }
}

// {context, dirId, dirPath, path, rootPath}, aborted
const end = ({ dirId }, context) => {
  const saved = context.savedParents[dirId]
  if (saved !== undefined) {
    context.toIgnore.parent = saved
    delete context.savedParents[dirId]
  }
  --balance
}

// type, name, {context, dirId, dirPath, path, rootPath}
const visit = (type, name, { dirPath }, context) => {
  let resolution = 0
  if (name === 'node_modules') {
    resolution = 0
  }
  const res = [context.toIgnore.test(name)]

  if (type === T_DIR) {   // Directory may have more specific rules.
    res.unshift(context.toIgnore.test(name + '/'))
  }
  for (const r of res) {
    if (!r) continue
    if ((resolution = Math.max(resolution, r.flag)) === TERM_EX) break
  }

  if (resolution === TERM) {
    return ign.push(name) && SKIP
  }
  if (type === T_FILE) {
    files.push(dirPath + '/' + name)
  } else if (type === T_SYMLINK) links.push(dirPath + '/' + name)
}

const toIgnore = new RuleTree(ignoreList)
const startDir = process.argv[2] || process.cwd()
const walker = new Walker(startDir, { begin, end, visit })
const savedParents = {}

print(inspect(toIgnore.dump()))
print('ROOT:', startDir, walker.rootDir)
walker.go({ begin, end, visit, toIgnore, savedParents })

print('dirs: %i, symlinks: %i, files: %i, ignored: %i, balance: %i',
  dirs.length, links.length, files.length, ign.length, balance)
print('savedParents:', inspect(savedParents))

if (links.length) print('SymLinks:\n' + links.join('\n'))

if (!ign.find((o) => /RuleTree.+js$/.test(o)) &&
  ign.find((o) => /spec\.js$/.test(o))) {
  print('rules seem to work!')
}
