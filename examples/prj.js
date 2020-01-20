//  Demoing some power of Duke.
'use strict'

const Duke = require('../src/DirWalker')
const { actionName, loadJSON, relativePath, BEGIN_DIR, END_DIR, DO_ABORT, DO_SKIP } = Duke

const HELP =
        `Scan directories for Node.js projects, sorting output by actual project names.
        Counting .js files will ignore those in '/test' or 'vendor' directories or in
        directories containing .html files (like code coverage report).
        Projects containing '/test' directory will be flagged by 'T'.`
const OPTS = { nested: ['n', 'allow nested projects'] }
const DO_PROJ = 0
const DO_COUNT = 1    //  Add file to count.
const DO_PROMOTE = 2  //  Found test support.

const commonRules = [
  [DO_SKIP, 'node_modules', '.*']
]

const projectRules = [
  [DO_COUNT, '*.js'],
  [DO_PROMOTE, '/test/'],
  [DO_SKIP, 'vendor/']
]

// Todo: we must swap the whole t

const pt = require('path')
const { dump, measure, parseCl, print } = require('./util')
const { args, options } = parseCl(OPTS, HELP)

const projects = []

const findMaster = (dir) =>
  projects.find((p) => dir.indexOf(p.full) === 0 && dir !== p.full)

const findThis = (dir) => projects.find((p) => p.full === dir)

let commonRulesTop, projectRulesTop, count, flag, full, name

//  Application-specific operations.
const processor = ({ absDir, action, dir, locals, name, type }) => {
  // ++nEntries && (maxDepth = Math.max(depth, maxDepth))
  switch (action) {
    case BEGIN_DIR:
      if (!options.nested && findMaster(absDir)) break

      const pkg = loadJSON(pt.join(absDir, 'package.json'))
      if (pkg) {
        const full = relativePath(absDir, './')
        const name = pkg.name || '<NO-NAME>'
        this.treeTop = projectRulesTop
      }
      break
    case END_DIR:
      if (locals.name) projects.push(locals)
      this.treeTop = commonRulesTop
      break
    case DO_PROJ:
      if (!projectPath) {
        projectPath = absDir
        locals.treeTop = this.tree.length
      } else if (!options.nested) return DO_ABORT
      locals.full = relativePath(absDir, './')
      locals.name = loadJSON(pt.join(absDir, name)).name || '<NO-NAME>'
      break
    case DO_PROMOTE:
      locals.promotion = 'T'
      return DO_SKIP
    case DO_COUNT:
      locals.count += 1
      break
  }
  return action
}

const walker = new Duke({ processor, commonRules })

commonRulesTop = walker.treeTop
projectRulesTop = walker.add(projectRules)
walker.treeTop = commonRulesTop

const t = measure(() => args.forEach((dir) => walker.walk(pt.resolve(dir))))

dump(walker.failures, 'Total %i failures.', walker.failures.length)

print('Total %i projects', projects.length)
print(
  'Total %i ms (%i µs per item) on %i entries, maximum directory depth: %i',
  t / 1000, t / nEntries, nEntries, maxDepth)
