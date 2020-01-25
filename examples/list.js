#!/usr/bin/env node
'use strict'

const HELP = `Scan directories for Node.js projects, sorting output by actual project names.
  Counting .js files will ignore those in '/test' or 'vendor' directories or in
  directories containing .html files (like code coverage report).
  Projects containing '/test' directory will be flagged by 'T'.`
const OPTS = {
  nested: ['n', 'allow nested projects'],
  verbose: ['V', 'talk a *lot*'],
  single: ['s', 'do not use multi-threading']
}
const
  {
    DO_ABORT, DO_SKIP, CONTINUE, T_FILE, T_DIR,
    actionName, Walker, Ruler, loadFile
  } = require('../src')

const DO_COUNT = 1    //  Add file to count.
const DO_PROMOTE = 2  //  Found test support.

Ruler.hook(() => {
  return undefined    //  Breakpoint place.
})

const commonRules = new Ruler([DO_SKIP, 'node_modules', '.*'])
const projectRules = new Ruler([
  [DO_SKIP, 'node_modules', '.*'],
  [DO_ABORT, '*.html'],
  [DO_COUNT, '*.js'],
  [DO_PROMOTE, '/test/'],
  [DO_SKIP, 'vendor/']
])

const color = require('chalk')
const pt = require('path')
const { dump, measure, parseCl, print } = require('./util')
const { args, options } = parseCl(OPTS, HELP, true)
const relativePath = require('./util/relative-path')
const talk = options.verbose
  ? print.bind(print, color.green) : () => undefined

const projects = []

const findMaster = (dir) =>
  projects.find((p) => dir.indexOf(p.absDir) === 0 && dir !== p.absDir)

const findThis = (dir) => projects.find((p) => p.absDir === dir)

//  Statistics
let dirLength = 0, nameLength = 10, nItems = 0

const onBegin = ({ absDir, dir, locals }) => {
  if (findThis(absDir)) return DO_SKIP  //  Already done - multi-threading?

  if (locals.master) throw Error('master')
  if (locals.project) throw Error('project')
  let v = locals.master = findMaster(absDir)

  if (v) {
    locals.project = v
    if (!options.nested) return talk('  DIR', absDir, dir)
  }

  if ((v = loadFile(pt.join(absDir, 'package.json'), true))) {
    if (v instanceof Error) {
      //  This happens when `root` argument of walk() is not a directory.
      if (v.code === 'ENOTDIR') return DO_SKIP
      throw v
    }
    v = JSON.parse(v.toString())
    const name = v.name || '<NO-NAME>'
    talk('PROJECT', absDir, dir)
    locals.project = { absDir, count: 0, name, promo: '' }
    if (locals.master) {
      locals.master = undefined
      locals.project.promo = 'N'
    }
    (locals.rules = projectRules) && (locals.ancs = undefined)
  }
  if (!locals.rules) {
    //  This parsing context will be in effect above the first project
    //  recognized in directory tree walking route.
    (locals.rules = commonRules) && (locals.ancs = undefined)
  }
}

//  If there was DO_ABORT in current dir, we won't get here.
const onEnd = ({ absDir, dir, locals }) => {
  // const { master, project } = locals
  if (!locals.project) return
  if (!locals.master) {
    projects.push(locals.project)
    nameLength = Math.max(locals.project.name.length, nameLength)
  }
  if (findThis(absDir)) talk('END', dir)
}

//  Application-specific operations.
const onEntry = ({ dir, locals, name, type }) => {
  const [action, ancs] = locals.rules.test(name, locals.ancs, name)
  const actName = actionName(action)   //  For verbose output.

  switch (action) {
    case DO_ABORT:
      talk('  DO_ABORT', dir)
      break
    case CONTINUE:
      //  Forward our rule parsing context to subdirectory.
      if (type === T_DIR) {
        return { ancs, rules: locals.rules }
      }
      break
    case DO_COUNT:
      if (type !== T_FILE) break
      talk('  DO_COUNT: %s @', name.padEnd(16), dir || '.')
      locals.project.count += 1
      break
    case DO_PROMOTE:
      if (type !== T_DIR) break
      locals.project.promo = locals.project.promo || 'T'
      return DO_SKIP
    case DO_SKIP:
      return action
    default:
      if (type === T_DIR) talk('default', actName, name, ancs)
  }
  ++nItems
  return action
}

const walker = new Walker({ onBegin, onEnd, onEntry })
const walk = (dir) => walker.walk(pt.resolve(dir))
let threads = args.length > 1 && !options.single
const task = threads
  ? () => Promise.all(args.map(walk)) : () => args.forEach(walk)

measure(task).then((t) => {
  dump(walker.failures, color.redBright, 'Total %i failures.',
    walker.failures.length)

  projects.sort((a, b) => a.name === b.name ? 0 : (a.name > b.name ? 1 : -1))

  projects.forEach((p) => {
    const dir = relativePath(p.absDir, './')
    dirLength = Math.max(dir.length, dirLength)
    print('%s %s %s:', p.name.padEnd(nameLength), p.promo || ' ',
      (p.count + '').padStart(5), dir)
  })
  print('- name '.padEnd(nameLength, '-'),
    '? - cnt:', '- directory '.padEnd(dirLength, '-'))
  print('Total %i projects', projects.length)
  threads = threads ? 'in ' + args.length + ' threads' : ''
  print('Total %i ms (%i µs/item) on %i items', t / 1000, t / nItems, nItems,
    threads)
})
