# dwalker [![Build Status](https://travis-ci.org/valango/duke.svg?branch=master)](https://travis-ci.org/valango/duke) [![Code coverage](https://codecov.io/gh/valango/duke/branch/master/graph/badge.svg)](https://codecov.io/gh/valango/duke)

![](https://github.com/valango/duke/blob/master/assets/quote.png)

Asynchronous rule-based file system walker. It:
   * does things most regexp-based walkers hardly can;
   * uses super simple rule definitions;
   * handles most file system errors by default;
   * provides powerful extendable API;
   * runs real fast.

This is what a simple [demo app](doc/examples.md)
does on my old 2,7 GHz MacBook Pro:
![](https://github.com/valango/duke/blob/master/assets/counts.png)

The version 6 is hugely different from its [ancestors](#version-history).

The further text describes the [usage](#usage), [API](#api) and [version history](#version-history).

## Usage
**NB:** This package needs Node.js v12.12 or higher.

**Install** with _yarn_ or _npm_
```
yarn add dwalker   ## npm i -S dwalker
```
The <a name="simple">following code</a> walks all given directory trees in parallel, gathering basic statistics:
```javascript
const walker = new (require('dwalker')).Walker()
const dirs = '/dev ..'.split(' ')

Promise.all(dirs.map(dir => walker.walk(dir))).then(res => {
  console.log('Done(%d):', res.length)
}).catch(error => {
  console.log('EXCEPTION!', error)
}).finally(() => {
  console.log(walker.stats)
})
// -> Done(1): { dirs: 8462, entries: 65444, errors: 2472, retries: 0, revoked: 0 }
// -> Elapsed: 1012 ms
```

### What it does
The _`Walker#walk()`_ method recursively walks the directory tree _width-first_.
It scans all directory entries, invoking the _handler functions_ as it goes,
keeping track of its internal rules tree.
For speed, all this is done asynchronously.

Please have a glance at its [_**core concepts**_](doc/walker-concepts.md),
if you haven't done so already.

## API
Contents: [package exports](#package-exports), [Walker](#walker-class), 
[common helpers](#common-helpers), [special helpers](#special-helpers), 
[rule system](#rule-system)
### Package exports
   * [_**`Walker`** class_](#walker-class)
   * [_**`Ruler`** class_](doc/ruler.md)
   * [_constants_](src/constants.js)
   * [_common helpers_](#common-helpers)
   
Types referred to below are declared in
[src/typedefs.js](src/typedefs.js).

### _`Walker`_ class
The most of the magic happens here. For details, see: [methods](#walker-instance-methods),
[properties](#walker-instance-properties), [class/static API](#walker-class-methods-and-properties),
[protected API](doc/walker-protected.md), and [exceptions handling](#exceptions-handling).

**`constructor`**`(options : {TWalkerOptions})`<br />
   * `avoid : string | strig[]` - the `avoid()` instance method will be called.
   * `interval : number=` - instance property setting.
   * `rules : *` - [rule definitions](#rules), or a _`Ruler`_ instance to be cloned.
   * `symlinks : boolean=` - enable symbolic links checking by _`onEntry()`_ handler.

_Walker_ instance stores given (even unrecognized) options in private _`_options`_ property.

#### Walker instance methods

See the [separate description](doc/walker-concepts.md#handlers)
of _`onDir()`_, _`onEntry()`_ and _`onFinal()`_ handler methods.

**`avoid`**`(...path) : Walker` - method<br />
Injects the _paths_ into _`visited`_ collection thus preventing them from being visited.
The arguments must be strings or arrays of strings - absolute or relative paths.

**`getDataFor`**`(dirPath) : * ` - method<br/ >
For accessing the data in the internal dictionary. Empty entries are created there before calling
the _`onDir()`_ handler. The _`Walker`_ itself does not use those values.

**`getOverride`**`(error) : number` - <a name="get-override">method</a><br />
Returns an overriding action code (if any) for the current exception and its context.
The _`Walker`_ calls this method internally and assigns its numeric return value
to `error.context.override` before calling its `onError()` method. A non-numeric return value
has no effect. Instead of overriding this method, you can directly modify the
[overrides export](#walker-class-methods-and-properties) of the package.

**`onError`**`(error: Error, context: TDirContext) : *` - method<br />
Called with trapped error after _`error.context`_ has been set up.
Default just returns _`error.context.override`_.
Returned action code will be checked for special values; a non-numeric return means this
was an unexpected error rejecting the _walk_ promise.

The _`Walker`_ may provide the following _`context.locus`_ values:
`'onDir', 'openDir', 'iterateDir', 'onEntry', 'closeDir', 'onFinal'`.
Overriding handlers may define their own locus names.

**`reset`**`([hard : boolean]) : Walker` - method<br />
Resets a possible _STC_. In a _hard_ case, it resets all internal state properties,
including those available via _`stats`_.
Calling this method during walk throws an unrecoverable error.

**`tick`**`(count : number)` - method<br />
Called during walk automatically. Default does nothing. 
Override this for progress monitoring etc.

**`trace`**`(handlerName, result, context, args)` - method<br />
Called right after every handler call. _Use this for **debugging only**!_
Default is an empty function.

**`walk`**`(startPath : string, [options : TWalkOptions]) : Promise` - method<br />
Walks the walk. The _`startPath`_ may be any valid pathname defaulting to _`process.cwd()`_.
Via _`options`_ you can override  _`trace()`_ method, any _handler methods_, as well as 
_`data`_ and _`ruler`_ instance properties. 
The promise resolves to _`data`_, to non-numeric return value from a handler or
rejects to unexpected error instance.

#### Walker instance properties
**`duration`**` : number` - microseconds elapsed from start of the current _walk batch_
or duration of the most recent batch.

**`failures`**` : Error[]` - any <a name="failures">exceptions overridden</a> during a walk.
The _`Error`_ instances in there will have a `context : TDirContext` property set.

**`ruler`**` : Ruler` - initial ruler instance for a new walk.

**`stats`**` : Object r/o` - general statistics as object with numeric properties:
   * `dirs` - number of visited directories;
   * `entries` - number of checked directory entries;
   * `errors` - number of exceptions encountered;
   * `retries` - number of operation retries (e.g. in case of out of file handles);
   * `revoked` - number of directories recognized as already visited (may happen with **`symlinks`** option set);
   * `walks` - number of _currently active_ walks.

**`walks`**` : number r/o` - number of currently active walks.

#### Walker class methods and properties
All those are directly available via the package exports.

**`newRuler`**`(...args) : Ruler` - factory method.

**`overrides`**` : Object` - error override rules as a tree:
( locus -> _`error.code`_ -> actionCode ).

**`shadow`**` : atring[]` - mask for omitting certain parts of context parameter,
before injecting it to Error instance for logging.

#### Walker protected API
Is described in a [separate document](doc/walker-protected.md). 

#### Exceptions handling
**The good news** is: whatever will happen during a walk, the _`Walker`_ instance won't throw
an exception!

If an exception occurs and there is an [override defined](#get-override) for it, a new entry
will be added to the [failures instance property](#failures), and the walk will continue.

Without an override defined, however, we'll have _an unexpected exception_.
In this case, the walk will terminate with an augmented _`Error`_ instance via rejection,
and the [example program above](#simple) would output something like this:
```
EXCEPTION! TypeError: Cannot read property 'filter' of undefined
    at ProjectWalker.onDir (/Users/me/dev-npm/nsweep/lib/ProjectWalker.js:111:38)
    at async doDir (/Users/me/dev-npm/nsweep/node_modules/dwalker/src/Walker.js:491:15)
  context: {
    depth: 0,
    dirPath: '/Users/me/dev-npm/nsweep',
    done: undefined,
    locus: 'onDir',
    rootPath: '/Users/me/dev-npm/nsweep',
    override: undefined
  }
} 
```
An error stack combined with a walk context snapshot should be enough to spot the bug.

### Common helpers
Those helpers are available via package exports and may be useful on writing handlers.

**`checkDirEntryType`**`(type : TEntryType) : TEntryType` - function<br />
returns the argument if it is a valid type code; throws an assertion error otherwise. 

**`dirEntryTypeToLabel`**`(type : TEntryType, [inPlural : boolean]) : string` - function<br />
returns human readable type name for valid type; throws an assertion error otherwise. 

**`makeDirEntry`**`(name : string , type : TEntryType, [action : number]) : TDirEntry` - function<br />
constructs and returns a ned directory entry with _`action`_ defaulting to `DO_NOTHING`.

**`makeDirEntry`**`(nativeEntry : fs.Dirent) : TDirEntry` - function<br />
returns a new directory entry based on 
[Node.js native one](https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_class_fs_dirent).

### Special helpers
To use those helpers, load them first, like:
```javascript
const symlinksFinal = require('dwalker/symlinksFinal')
```
**`pathTranslate`**`(path, [absolute]) : string` function.<br />
Translate the `path` from POSIX to native format, resolves the
leading '~' to user home directory. If `absolute` is on, then
makes the path absolute, always ending with path separator.

**`relativize`**`(path, [rootPath, [prefix]]) : string` function.<br />
Strips the _`rootPath`_ (defaulting to _`homeDir`_)part from given `path`, if it is there.
Optional _`prefix`_ string will be applied to resulting relative path.
May help to make some reports easier to read.

**`relativize.homeDir`**` : string` - initialized to _current user's home directory_.

**`symlinksFinal`**`(entries, context) : *` async handler.<br />
Use it inside _`onFinal`_ handler for following the symbolic links.
Example:
```javascript
const onFinal = function (entries, context) {
  return this._useSymLinks
    ? symlinksFinal.call(this, entries, context) : Promise.resolve(0)
}
```

### Rule system
The main goal here was to keep rules simple (atomic), even when describing 
context-sensitive rules and special exclusions.

Rule definitions are tuples `(action-code, {pattern})`,
quite similar to _bash_ glob patterns or _.gitignore_ rules. Example:
```javascript
ruler.add(
  DO_SKIP, '.*', '!/.git/', 'node_modules/', 'test/**/*',
  11, 'package.json', '/.git/', '/LICENSE;f', '*;l')
```
Here the first rule tells to ignore the dreaded `node_modules` directory and
any entries starting with '.', except the top-level `.git` directory. Also, nothing
under the `test` directory, where ever found, will count. The trailing `'/'`
indicates the directory.

The second rule asks for some sort of special care to be taken for all `package.json`
entries with no regard to their type, for top-level `.git` directory, for top-level
`LICENSE` file and for all symbolic links. And, yes, the `.weirdos/package.json`
will be ignored.

Without _explicit type_, all rules created are typeless or `T_DIR` ('d').
Explicit type must match one in [`S_TYPES` constant](src/constants.js).

Behind the scenes, a _`Ruler`_ instance creates and interprets a _**rule tree**_
formed as an array on records <br/>
_`(type, expression, ancestorIndex, actionCode)`_.
For the above example, the _`Ruler` dump_ would be like:
```
       node typ regex            parent  action
      -----+---+-----------------------+-------------
         0: 'd' null,               -1,  DO_NOTHING,
         1: ' ' /^\./,               0,  DO_SKIP,
         2: 'd' /^\.git$/,          -1, -DO_SKIP,
         3: 'd' /^node_modules$/,    0,  DO_SKIP,
         4: 'd' /^test$/,           -1,  DO_NOTHING,
         5: 'd' null,                4,  DO_NOTHING,
         6: ' ' /./,                 5,  DO_SKIP,
         7: ' ' /^package\.json$/,   0,  11,
         8: 'd' /^\.git$/,          -1,  11,
         9: 'f' /^LICENSE$/,        -1,  11,
        10: 'l' /./,                 0,  11,
_ancestors: [ [ 0, -1 ] ]

```
The internal _`ancestors`_ array contains tuples _`(actionCode, ruleIndex)`_.

The _`Ruler#check()`_ method typically called from _`Walker#onEntry()`_ finds
all rules matching the given entry _`(name, type)`_ and fills in the
lastMatch array, analogous to ancestors array. Then it returns the most
prominent (the highest) action code value. The `DO_SKIP` and other system action codes
prevail the user-defined codes simply because they have higher values.

A negative value screens the actual one. _**Do not**_ use negative values in rule definitions -
the ruler will do this for you, when it encounters a pattern starting with '!'.

The sub-directories opened later will inherit new _`Ruler`_ instances with _`ancestors`_
set to _`lastMatch`_ contents from the upper level.
So, the actual rule matching is trivial, and the rules can be switched dynamically.

For further details, check the
[_`Ruler`_ reference](doc/ruler.md) and
the special [demo app](doc/examples.md#parsejs). 

## Version history
* v6.0.0 @20201225
   - cleaned code and API (breaking changes) after using _`dwalker`_ in some actual projects,
   so the basic use cases are clear now. As the general concepts persist,
   migration sould not be a major headache and reading the updated
   [core concepts](doc/walker-concepts.md) should help.
* v5.2.0 @20201202
   - added: Walker#getOverride instance method.
* v5.1.0 @20201121
   - removed: hadAction(), hasAction() Ruler instance methods.
* v5.0.0 @20201120
   - Walker totally re-designed (_a **breaking** change_);
   - Ruler#check() refactored (_a non-breaking change_);
   - documentation and examples re-designed.
* v4.0.0 @20200218
   - several important fixes;
   - Walker throws error if on illegal action code returned by handler;
   - added: Walker#expectedErrors, removed: Walker#getMaster;
   - added: check(), hadAction(), hasAction() to Ruler, removed: match();
   - an up-to-date documentation;
* v3.1.0 @20200217
* v3.0.0 @20200211
* v2.0.0 @20200126
* v1.0.0 @20200124
* v0.8.3 @20200123: first (remotely) airworthy version.
