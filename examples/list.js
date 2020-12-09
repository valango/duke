#!/usr/bin/env node

//  Sample application scanning for npm javascript projects
//  and computing some simple statistics on them.
'use strict'

const { readFile } = require('fs').promises
const { inspect } = require('util')
const color = require('chalk')
const { DO_NOTHING, DO_ABORT, DO_CHECK, DO_SKIP, T_DIR, Walker } = require('..')
const { dumpFailures, leaksTrap, parseCl, print } = require('./util')
const relativize = require('../relativize')

const { max } = Math
const N = color.redBright, Y = color.greenBright

const HELP = `Scan directories for Node.js projects, sorting output by actual project names.
  Counting .js files will ignore those in '/test' or 'vendor' directories or in
  directories containing .html files (like code coverage report).
  Projects containing '/test' directory will be flagged by 'T'.`
const OPTS = { verbose: ['v', 'talk a *lot*'] }

//  Project-specific actions (also data array indexes)
const PATH = 0
const A_FILES = 1     //  Source files
const A_TESTS = 2     //  Tests?
const A_DOCS = 3      //  Markup files except the README.md
const A_SPECIALS = 4  //  Some specials
const A_GIT = 5       //  Git repo.
const A_NESTED = 6    //  package.json found somewhere in project subdirectories
const A_INSTALLED = 7 //  node_modules
const NAME = 8
const VERSION = 9
const SIZE = 10

//  Default rules are applied until DO_CHECK action is recognized.
//  The statistics will be collected even before the project is detected
//  but it will be discarded if it wasn't a project.
const defaultRules = [
  DO_SKIP, '.*/',
  DO_ABORT, 'lcov-report/', 'lcov.info',
  DO_CHECK, 'package.json;f',
  A_FILES, '*.js*', '*.vue', '*.ts', '!package.json',
  A_INSTALLED, 'node_modules/',
  A_DOCS, '*.md', '!README*.md',
  A_TESTS, 'test*/',
  A_SPECIALS, '*.yml', 'README*;f', 'LICENSE*;f'
]

const projectRules = [
  [DO_SKIP, 'node_modules/', '.*/', 'vendor/'],
  [A_FILES, '*.js*', '*.vue', '*.ts'],
  [A_NESTED, 'package.json;f'],
  [A_DOCS, '*.md']
]

const { args, options } = parseCl(OPTS, HELP, true)   //  Command-line interface.

//  Working data to be shared with all threads / entries.
const data = {}
//  Create a walker avoiding Mac OS-X madness.
const walker = leaksTrap(new Walker({ rules: defaultRules }))
  .avoid(relativize.homeDir + 'Library', '/Applications', '/Library')

//  Uncomment this, if you _really_ like a mess on your screen. ;)
/* walker.trace = (name, result, context, args) => {
  console.log(context.absPath, args[0])
} /* */

//  Todo: move to different file!
const parsePackage = pack => {
  try {
    return JSON.parse(pack.toString())  //  Todo: add content checking!
  } catch (error) {
    return error
  }
}

// Initialize a project data - just in case ;)
const onDir = async function (context) {
  let { absPath, current } = context

  if (current && context.data[current[PATH]] === current) {
    return this.onDir(context)        //  We are in recognized project already.
  }
  context.current = current = new Array(SIZE)
  for (let i = A_FILES; i <= A_INSTALLED; ++i) current[i] = []
  current[PATH] = absPath
  return DO_NOTHING
}

//  Handle some special cases.
const onEntry = function (entry, context) {
  let action = this.onEntry(entry, context)
  const { current } = context, { name } = entry

  if (action < SIZE && action > DO_NOTHING) {
    current[action].push(name)
    if (action === A_INSTALLED) action = DO_SKIP
  } else if (entry.type === T_DIR && name === '.git') {
    current[A_GIT].push(name)
  }
  return action
}

//  If there was a project recognized, then initialize and register this.
const onFinal = async function (entries, context, action) {
  if (action < DO_SKIP) {
    const { absPath, current } = context

    if (action === DO_CHECK) {
      const pack = parsePackage(await readFile(absPath + 'package.json'))
      const v = pack.name
      current[NAME] = (v && v.length > 20) ? v.substring(0, 17) + '...' : v
      current[VERSION] = pack.version
      context.ruler = Walker.newRuler(projectRules)
      context.data[absPath] = current
    }
  }
  return action
}

walker.tick = count => print('Entries processed: ' + count + '\r')

//  Results formatting helper - see - that's more complex than the handlers logic!
const composeResults = (data) => {
  let maxPathLen = 0
  const res = [], keys = Reflect.ownKeys(data).sort(), LIMIT = 40

  res.push(`Projects detected: ${keys.length}`, '')

  for (const key of keys) {
    let s = relativize(data[key][PATH])

    if (s.length > LIMIT) {
      s = s.substring(0, LIMIT - 2) + '...'
    }
    maxPathLen = max((data[key][PATH] = s).length, maxPathLen)
  }

  if (maxPathLen) {
    for (const key of keys) {
      const d = data[key], row = []
      let s = d[PATH].padEnd(maxPathLen + 1), v

      row.push(d[A_INSTALLED].length ? color.bgBlue(s) : s)
      ;(s = ((v = d[NAME] + '') || 'no name').padEnd(20)) && row.push(v ? s : N(s))
      ;(s = ((v = d[VERSION] + '') || '?').padEnd(8)) && row.push(v ? s : N(s))
      ;(s = ((v = d[A_FILES].length) + '').padStart(4)) && row.push((v ? s : N(s)) + '.js')
      ;(s = ((v = d[A_DOCS].length) + '').padStart(3)) && row.push((v > 1 ? Y(s) : s) + '.md')
      row.push(d[A_TESTS].length ? Y('tests') : '     ')
      if (!d[A_GIT].length) row.push(N('no git'))
      if (d[A_SPECIALS].length > 0) row.push(d[A_SPECIALS].join(' '))
      if (d[A_NESTED].length > 0) row.push(N('NESTED?'))
      res.push(row.join(' '))
    }
  }
  return res
}

Promise.all(args.map(dir => walker.walk(dir, { data, onDir, onEntry, onFinal }))).then(res => {
  print('******* DONE *******      ')
  if (options.verbose) print(inspect(res, { depth: 10 }))
  print(composeResults(data).join('\n'))
}).catch(error => {
  print('****** FAILED ******      ', error)
  if (options.verbose) print('Halted at:\n', inspect(walker.halted, { depth: 10 }))
}).finally(() => {
  const { dirs, entries } = walker.stats, t = walker.duration

  dumpFailures(walker.failures, options.verbose)
  print('\nSome projects may have ' + color.bgBlue('dependencies installed') +
    ' and may exhibit some ' + N('problems') + ' or ' + Y('bonuses') + '.')
  print('Total %i ms (%i µs per entry) for %i entries in %i directories.',
    t / 1000, t / entries, entries, dirs)
})
