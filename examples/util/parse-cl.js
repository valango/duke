'use strict'

const DEF_ARG = '.'
const DEF_OPTS = { help: ['h', 'display help information'] }

const defaults = require('lodash.defaults')
const dump = require('./dump')
const expand = require('./expand')
const print = require('./print')

/**
 * Parse command line for options. Check for errors, set defaults as necessary.
 *
 * @returns {Object<{args: Array<string>, options: Object}>}
 */
module.exports = (
  availableOptions, help, doExpand = false, input = process.argv
) => {
  const opts = defaults({}, availableOptions, DEF_OPTS)
  const errors = [], options = {}, cwd = process.cwd()
  let args = [], name = input[1]

  for (let i = 2, o, v; (v = input[i]) !== undefined; ++i) {
    if (v[0] !== '-') {
      args.push(v)
    } else {
      if (v[1] === '-') {
        v = v.substring(2)
        o = opts[v] && v
      } else {
        v = v.substring(1)
        o = Object.keys(opts).find((k) => opts[k][0] === v)
      }
      if (o) {
        options[o] = true
      } else {
        errors.push(`unknown option: '${input[i]}'`)
      }
    }
  }

  if (name.indexOf(cwd) === 0) name = name.substring(cwd.length + 1)

  if (errors.length) {
    dump(errors, 'Try: node %s -h', name)
    process.exit(1)
  }

  if (options.help) {
    if (help) print(help)
    print('Usage:\n ', name, '[options] [directory...]')
    print('Options:')
    Object.keys(opts).forEach((k) =>
      print('  --%s -%s : %s', k.padEnd(10), opts[k][0], opts[k][1]))
    process.exit(0)
  }

  if (doExpand) {
    args = args.length === 0 ? [DEF_ARG] : expand(args)
  }

  return { args, options }
}
