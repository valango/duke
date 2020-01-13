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

const ruler = new RuleTree(ignoreList)

// { dirId, dirPath, path, rootPath }, parentContext
ruler.begin = function ({ dirPath, path, setContext }) {
  dirs.push(dirPath) && ++balance
  const m = this.match(path[path.length - 1] + '/')
  //  If the directory name matches any rule, we need to remember it.
  while (m.length) {
    const { index, rule } = m.shift()
    if (rule === GLOB) continue
    setContext({ parent: index }) //  New start for rules.
    break
  }
}

// {context, dirId, dirPath, path, rootPath}, aborted
ruler.end = function () {
  --balance
}

// type, name, {context, dirId, dirPath, path, rootPath}
ruler.visit = function (type, name, { dirPath }) {
  let resolution = 0
  if (name === 'node_modules') {
    resolution = 0
  }
  const res = [this.test(name)]

  if (type === T_DIR) {   // Directory may have more specific rules.
    res.unshift(this.test(name + '/'))
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

const startDir = process.argv[2] || process.cwd()
const walker = new Walker(startDir)

print(inspect(ruler.tree))
print('ROOT:', startDir, walker.rootDir)
walker.go(ruler)

print('dirs: %i, symlinks: %i, files: %i, ignored: %i, balance: %i',
  dirs.length, links.length, files.length, ign.length, balance)

if (links.length) print('SymLinks:\n' + links.join('\n'))

if (!ign.find((o) => /RuleTree.+js$/.test(o)) &&
  ign.find((o) => /spec\.js$/.test(o))) {
  print('Rules seem to work!')
} else {
  print('Rule system failed!')
}
