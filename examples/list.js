#!/usr/bin/env node

//  Sample application scanning for npm javascript projects
//  and computing some simple statistics on them.

/* eslint no-console:0 */
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

//  Default rules are applied until DO_CHECK action is recognized.
const defaultRules = [
  DO_SKIP, 'node_modules/', '.*/', DO_CHECK, 'package.json'
]

//  Project-specific actions and rules
const DO_COUNT_FILE = 1     //  Source files
const DO_COUNT_TEST = 2     //  Tests?
const DO_COUNT_DOCS = 3     //  Markup files except the README.md
const DO_COUNT_SPECIAL = 4  //  Some specials
const NAME = 5
const VERSION = 6
const INSTALLED = 7
const GIT = 8

const projectRules = [
  [DO_SKIP, 'node_modules/', '.*/', '/reports/', 'vendor/'],
  [DO_ABORT, '*.html'],
  [DO_COUNT_FILE, '*.js'],
  [DO_COUNT_TEST, '/test*/'],
  [DO_COUNT_DOCS, '*.md', '!README*.md'],
  [DO_COUNT_SPECIAL, '/*.yml', '/README*', '/LICENSE']
]

const { args, options } = parseCl(OPTS, HELP, true)   //  Command-line interface.

//  Working data to be shared with all threads / entries.
const data = {}
//  Create a walker avoiding Mac OS-X madness.
const walker = leaksTrap(new Walker({ rules: defaultRules }))
  .avoid(relativize.homeDir + 'Library', '/Applications', '/Library')

let maxPathLen = 0

//  Results formatting helper.
const composeResults = (data) => {
  const res = [], keys = Reflect.ownKeys(data).sort()

  res.push(`Projects detected: ${keys.length}`, '')

  for (const key of keys) {
    const d = data[key], row = []
    let s = relativize(key).padEnd(maxPathLen + 1), v

    row.push(d[INSTALLED] ? color.bgBlue(s) : s)
    ;(s = ((v = d[NAME] + '') || 'no name').padEnd(20)) && row.push(v ? s : N(s))
    ;(s = ((v = d[VERSION] + '') || '?').padEnd(8)) && row.push(v ? s : N(s))
    ;(s = ((v = d[DO_COUNT_FILE].length) + '').padStart(4)) && row.push((v ? s : N(s)) + '.js')
    ;(s = ((v = d[DO_COUNT_DOCS].length) + '').padStart(3)) && row.push((v > 1 ? Y(s) : s) + '.md')
    row.push(d[DO_COUNT_TEST].length ? Y('tests') : '     ')
    if (!d[GIT]) row.push(N('no git'))
    if (d[DO_COUNT_SPECIAL].length > 0) row.push(d[DO_COUNT_SPECIAL].join(' '))
    res.push(row.join(' '))
  }
  return res
}

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

//  Dynamically injectable onEntry handler, uses original handler method.
const onProjectEntry = function (entry, context) {
  const action = this.onEntry(entry, context), { absPath, current } = context

  if (action > 0 && action < NAME) {
    const rootLength = current[0].length
    current[action].push(absPath.substring(rootLength) + entry.name)
  } else if (current.top === context.depth && action === DO_SKIP && entry.type === T_DIR) {
    if (entry.name === 'node_modules') {
      context.current[INSTALLED] = true
    } else if (entry.name === '.git') context.current[GIT] = true
  }
  return action
}

//  If package.json exists in this directory, then:
// - validate the package contents;
// - set ruler and handlers for current and child directories (dynamic strategy pattern);
// - initiate data for current project and inject it to results data space;
// - re-evaluate existing directory entries according to new rules.
const onDir = async function (context) {
  const { absPath, current } = context

  if (current && context.data[current[0]] === current) {
    return this.onDir(context)        //  We are in recognized project already.
  }
  const pack = parsePackage(await readFile(absPath + 'package.json'))
  //  No error thrown - so the file exists!
  if (pack instanceof Error) return this.onError_(pack, context, 'onDir')

  const project = context.data[context.absPath] = context.current = { top: context.depth }
  maxPathLen = max(relativize(project[0] = context.absPath).length, maxPathLen)
  let v = NAME
  while (--v > 0) project[v] = []
  project[NAME] = ((v = pack.name) && v.length > 20) ? v.substring(0, 17) + '...' : v
  project[VERSION] = pack.version
  context.ruler = Walker.newRuler(projectRules)
  context.onEntry = onProjectEntry

  return DO_NOTHING
}

walker.tick = count => process.stdout.write('Entries processed: ' + count + '\r')

Promise.all(args.map(dir => walker.walk(dir, { data, onDir }))).then(res => {
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
