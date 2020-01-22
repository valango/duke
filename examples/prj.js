//  Demoing some power of duke.
'use strict'

const duke = require('../src/DirWalker')
const { DO_ABORT, DO_SKIP, NOT_YET, T_FILE, T_DIR } = duke
const RuleTree = require('../src/RuleTree')
const loadJSON = require('../src/load-json')

const HELP = `Scan directories for Node.js projects, sorting output by actual project names.
  Counting .js files will ignore those in '/test' or 'vendor' directories or in
  directories containing .html files (like code coverage report).
  Projects containing '/test' directory will be flagged by 'T'.`
const OPTS = {
  nested: ['n', 'allow nested projects'],
  verbose: ['V', 'talk a *lot*']
}
const DO_COUNT = 1    //  Add file to count.
const DO_PROMOTE = 2  //  Found test support.

RuleTree.sincereHook(() => {
  return undefined    //  Breakpoint place.
})

const commonRules = new RuleTree([DO_SKIP, 'node_modules', '.*'])
const projectRules = new RuleTree([
  [DO_SKIP, 'node_modules', '.*'],
  [DO_ABORT, '*.html'],
  [DO_COUNT, '*.js'],
  [DO_PROMOTE, '/test/'],
  [DO_SKIP, 'vendor/']
])

// Todo: we must swap the whole t

const { clone } = require('lodash')
const color = require('chalk')
const pt = require('path')
const { dump, measure, parseCl, print } = require('./util')
const { args, options } = parseCl(OPTS, HELP)
const relativePath = require('./util/relative-path')
const talk = options.verbose
  ? print.bind(print, color.green) : () => undefined

const projects = []

const findMaster = (dir) =>
  projects.find((p) => dir.indexOf(p.absDir) === 0 && dir !== p.absDir)

const findThis = (dir) => projects.find((p) => p.absDir === dir)

let pkg, dirLength = 0, nameLength = 10, nItems = 0

const onBegin = ({ absDir, dir, locals }) => {
  let v
  if (findThis(absDir)) return DO_SKIP  //  Already done - multi-threading.
  //  Here we have locals from processing the entry in parent dir.
  //  Here we can set locals for all the following calls.
  if ((v = findMaster(absDir))) {
    locals.master = v
    locals.project = clone(v)
    if (!options.nested) return talk('  DIR', dir)
  }
  if ((pkg = loadJSON(pt.join(absDir, 'package.json')))) {
    const name = pkg.name || '<NO-NAME>'
    talk('PROJECT', dir)
    locals.project = { absDir, count: 0, name, promo: ' ' }
    ;(locals.rules = projectRules) && (locals.ancs = undefined)
  }
  if (!locals.rules) {
    //  This parsing context will be in effect above the first project
    //  recognized in directory tree walking route.
    (locals.rules = commonRules) && (locals.ancs = undefined)
  }
}

//  If there was DO_ABORT in current dir, we won't get here.
const onEnd = ({ absDir, dir, locals }) => {
  const { master, project } = locals
  if (!project) return
  if (master) {
    (master.promo = project.promo) && (master.count = project.count)
  } else {
    projects.push(project)
    nameLength = Math.max(project.name.length, nameLength)
  }
  if (findThis(absDir)) talk('END', dir)
}

//  Application-specific operations.
const onEntry = ({ absDir, dir, locals, name, type }) => {
  const [action, ancs] = locals.rules.test(name, locals.ancs, name)

  switch (action) {
    case DO_ABORT:
      talk('ABORT', dir)
      break
    case NOT_YET:
      //  Forward our rule parsing context to subdirectory.
      if (type === T_DIR) locals.ancs = ancs
      break
    case DO_COUNT:
      if (type !== T_FILE) break
      talk('  CNT: %s @', name.padEnd(16), dir || '.')
      locals.project.count += 1
      break
    case DO_PROMOTE:
      if (type !== T_DIR) break
      locals.project.promo = 'T'
      return DO_SKIP
    case DO_SKIP:
      return action
    default:
      if (type === T_DIR) talk('DEFAULT', action, name, ancs)
  }
  ++nItems
  return action
}

const walker = duke()

const t = measure(() => args.forEach((dir) =>
  walker.walk(pt.resolve(dir), { onBegin, onEnd, onEntry })))

dump(walker.failures, color.redBright, 'Total %i failures.',
  walker.failures.length)

projects.sort((a, b) => a.name === b.name ? 0 : (a.name > b.name ? 1 : -1))

projects.forEach((p) => {
  const dir = relativePath(p.absDir, './')
  dirLength = Math.max(dir.length, dirLength)
  print('%s %s %s:', p.name.padEnd(nameLength), p.promo,
    (p.count + '').padStart(5), dir)
})
print('- name '.padEnd(nameLength, '-'),
  '? - cnt:', '- directory '.padEnd(dirLength, '-'))
print('Total %i projects', projects.length)

print('Total %i ms (%i µs/item) on %i items', t / 1000, t / nItems, nItems)
