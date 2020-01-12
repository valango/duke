/**
 * @module gitignore
 */
'use strict'
// const ME = 'gitignore'

const { format } = require('util')
const RuleTree = require('../src/RuleTree')
const Walker = require('../src/Walker')
const { NIL, TERM, TERM_EX } = RuleTree
const {
        ABORT,
        SKIP,
        T_DIR,
        T_FILE,
        T_SYMLINK
      } = Walker

const ignoreList = [
  '*.tmp',
  '.*',
  '!stats.tmp',
  '/node_modules'
]

const print = (...args) => process.stdout.write(format.apply(null, args) + '\n')

let nFiles = 0, nDirs = 0, nLinks = 0, nIgn = 0, balance = 0

// { dirId, dirPath, path, rootPath }, parentContext
const begin = ({ dirId, path }, parentContext) => {
  // print('BEG_' + dirId, path)
  ++nDirs && ++balance
  return parentContext
}

// {context, dirId, dirPath, path, rootPath}, aborted
const end = ({ dirId }, aborted) => {
  --balance
  // print('END_' + dirId, aborted ? 'ABORTED' : '')
}

// type, name, {context, dirId, dirPath, path, rootPath}
const visit = (type, name, { context, path }) => {
  let resolution = 0
  if (name === '.git') {
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
    print('IGN', path, name)
    ++nIgn
    return SKIP
  }
  if (type === T_FILE) {
    ++nFiles
  } else if (type === T_SYMLINK) ++nLinks
}

const toIgnore = new RuleTree(ignoreList)
console.log(toIgnore.dump())
const startDir = process.argv[2] || process.cwd()
const walker = new Walker(startDir, { begin, end, visit })

print('ROOT:', startDir)
print('START:', walker.rootDir)

walker.go({ toIgnore })

print('dirs: %i, files: %i, ignored: %i, balance: %i', nDirs, nFiles, nIgn,
  balance)
