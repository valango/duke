## [`Walker` class](Walker.md)
`Walker` instance has 
[`walkSync()`](Walker.md#Walker+walkSync) method,
which does most of the job. It traverses directory hierarchy width-first,
calling application-defined handlers, as it goes. The walkSync() code
is re-enterable and it can run in parallel promise instances.

Here is simplified code of `walkSync()` method:
```javascript
function walkSync (rootPath, walkOptions = undefined) {
  const options = { ...this.options, ...walkOptions }
  const rootDir = path.resolve(rootPath)
  let action, context, directory, { data } = options, entry
  let fifo = [{ data, dir: '', rootDir, ruler: this.defaultRuler }]

  while (!this.terminate && (context = fifo.shift()) !== undefined) {
    context.absDir = rootDir + context.dir
    directory = fs.opendirSync(join(root, dir))

    if ((action = onBegin(context)) < DO_SKIP) {
      while (action < DO_ABORT) {
        action = 0
        if (!(entry = directory.readSync())) break
        action = onEntry({...context, ..._.pick(entry, ['name', 'type'])})

        if (action < DO_SKIP && entry.type === T_DIR) {
          fifo.push({
            ...context, dir: context.dir + '/' + entry.name,
            ruler: context.ruler.clone(true)
          })
        }
      }
    }
    directory.closeSync()

    if ((action = onEnd({action, ...context})) >= DO_ABORT) {
      fifo = removeAllPushedSubdirectoriesOf(context.dir)
    }
  }
  return data
}
```
The actual implementation does a little bit more:
   1. If exception occur and is recognized as [expected one](Walker.md#Walker+expectedErrors),
   then it is just logged in Walker#failures and proper action code, usually
   `DO_SKIP` is applied.
   1. The [Walker#trace plugin function](Walker.md#Walker+trace) is called immediately
   after any handler function invocation. This feature is for debugging only.
   1. The `directories` and `entries` static counters are updated and 
   [Walker#tick](Walker.md#Walker+tick) plugin function is called regularly -
   this feature is intended for progress indicators etc.
   1. The `terminate` property is set true whenever `DO_HALT` action code is returned
   by any handler. This forces all the Walker instance to shut down.

The asynchronous [`walk()`](Walker.md#Walker+walk) method uses `walksSync()` code.
It takes `Walker#options.promises` array (initializing it if necessary)
and inserts it into the `context` object, thus making it available to
handlers. It's return value resolves to promises array with the first member being
the value returned from `walkSync()` itself.

## Action codes
These are positive integer values that control the Walker and application code as well.
Three values (in ascending order) are reserved for Walker:
   * **`DO_SKIP`** from onBegin() - skip the current directory and all it's sub-dirs;
   * **`DO_SKIP`** from onEntry() - skip / ignore the current directory entry;
   * **`DO_ABORT`** - stop scanning the current directory and skip all it's sub-dirs;
   * **`DO_HALT`** - all the effects of `DO_ABORT` plus disabling any walking of Walker instance.
   
In case of asynchronous walking, none of the codes above can affect already initialized promises.

Proprietary action codes between `0` and `DO_SKIP` can be defined by application.

## [`Ruler` class](Ruler.md)
Probably this class has little use outside of `Walker`. However, it may be useful
to understand it's basics.

**`Ruler#check()`** method returns a numeric _action code_, which is just the highest of possible others.
This is because there may be several rules that match a particular node.
Sometimes it is better to use `hasAction()` (affected by the most recent check()) and 
`hadAction()` (affected by the last check before `clone(true)` was called)
instance methods, not to rely on `check()` return value only.

Rule exclusions can be defined, prefixing rule definition path with '^' symbol.
It has similar effect to '!' symbol in _.gitignore_ file.

**Example:** after `const ruler = new Ruler(1, '*.js', '^test/**/*', 2, 'index.js')`
the ruler instance methods would work like this:

| path traversed | check() | hasAction(2) | hasAction(1) |
| :-- | --- | --- | --- |
| foo/bar.js | 1 | false | true |
| foo/index.js | 2 | true | true |
| test/bar.js | 0 | false | false |
| test/index.js | 2 | true | false |

Try it yourself with [examples/parsePath.js](../examples/parse.js), like this:
```
   $ examples/parsePath.js 1 "*.js" "^test/**/*" 2 index.js 0 foo/bar.js
```
