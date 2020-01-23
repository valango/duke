# dwalker [![Build Status](https://travis-ci.org/valango/duke.svg?branch=master)](https://travis-ci.org/valango/duke) [![Code coverage](https://codecov.io/gh/valango/duke/branch/master/graph/badge.svg)](https://codecov.io/gh/valango/duke)

![](assets/quote.png)

Rule-based file directory walker - fancy 
alternative to globber-based directory walkers.

Imagine, you want to count all directory entries anywhere below given directory,
by entry types and get report like this:
```
       directory: 4370
            file: 38392
         symLink: 105
Total 1210 ms (28 µs per item), max directory depth: 8.
The deepest directory:
../sincere/node_modules/resolve/test/resolver/symlinked/_/node_modules
```

How to get there? Just take a look to
[examples/count.js](examples/count.js) 
or better yet - clone the project and play around a bit.

## Usage
**NB:** This package needs Node.js v12.12 or higher.

Install with npm

```
npm i dwalker
```

### How it works
Class instance of DirWalker exposes **_`walk()`_** method,
which does most of the job. It traverses directory hierarchy width-first,
calling application-defined handlers, as it goes. The walk() code
is re-enterable and it can run in parallel promise instances.

Simplified algorithm:
```javascript
function walk (root, {onBegin, onEntry, onEnd}) {
  let action, context, directory
  const fifo = [{ dir: '' }]

  while ((context = fifo.shift()) !== undefined) {
    const { dir } = context
    if ((action = onBegin(context)) === DO_ABORT) return
    if (action === DO_SKIP) continue

    directory = fs.opendirSync(join(root, dir))

    while (({ name, type } = directory.readSync())) {
      action = onEntry({ name, type, ...context })
      if (action === DO_ABORT) discardPushedEntriesAndBreak()
      //  The entries pushed here will be processed next.
      if (action !== DO_SKIP && type === 'dir') fifo.push({dir: join(dir, name)})
    }
    directory.closeSync()

    if ((action = onEnd(context)) === DO_ABORT ||
      wasError() && action !== DO_SKIP) {
        return
    }
  }
}
```
Application - specific handlers _`onBegin`_, _`onEnd`_, _`onEntry`_ and 
_`onError`_ are all optional, but 
_`DirWalker`_ just won't do much good without them.

Things really get exciting, when we apply some business logic in our handlers.
See [another example](examples/list.js).

## Package exports
### Class `DirWalker`
**_`constructor`_**_`(options=: object)`_

The optional _`options`_ argument may contain default handlers for _`walk()`_.

**_`failures`_**_`: Array<string>`_ property

Can be examined any time.

**_`options`_**_`: object`_ property

Copy of constructor options. _`walk()`_ method looks here for default handlers.

**_`terminate`_**_`: boolean`_ property

_Truey_ value prevents any further walking.

**_`registerFailure`_**_`(failure: *, comment=: string): DirWalker`_ method

If _`failure`_ is not string, then it's toString() method is used to
retrieve message text to be pushed into _`failures`_ array.
If _`comment`_ is supplied, it will be appended to message after `'\n  '` string.

**_`walk`_**_`(rootDir: string, handlers=: object): DirWalker`_ method

Does the walking from _`rootDir`_ down.
If no handlers specified, if uses those found in _`options`_ property.

### Class `RuleTree`
_`DirWalker`_ is not directly dependent on this class, but it is designed specially
to work with it, so enjoy!

**_`constructor`_**_`(rules=: *, options=: object)`_

if _`rules`_ is supplied, then _`add()`_ method is invoked. Available _`options`_ are:
   * `action: number   ` - initial value for _`defaultAction`_ property.
   * `extended: boolean` - enables sets '{a,b}' -> '(a|b)'; default: `true`.
   * `optimize: boolean` - enables rule optimization; default: `true`.

**_`defaultAction`_**_`: integer`_ property

Action to be bound to new rule. This value is used and possibly mutated by _`add()`_.

**_`add`_**_`(rule: *, action=: number): RuleTree`_ method

Add new rules. If the first item in definitions array is not string,
it will be treated as action code, which will prevail over default action.

If `rule` is an array, then every numeric member will be interpreted as
action code for following rule(s). Array may be nested.
Example (two lines below have the same effect):

```javascript
o.add([DO_SKIP, 'node_modules', '.*', DO_DEFAULT, '*.js', 'test/*spec.js'])
o.add(['node_modules', '.*'], DO_SKIP).add([DO_DEFAULT, '*.js', 'test/*spec.js'])
```

**_`dump`_**_`(): Array<Array>`_ method

Returns clone of the internal rule tree - useful for diagnostics and testing.

**_`match`_**_`(string: string, ancestors=: Array): Array<*>`_ method

The ancestors argument is usually result from another call to _`match()`_.
In most cases, it is far easier to use _`test()`_ method instead.

**_`test`_**_`(string: string, ancestors=: Array): [action, ancestors]`_ method

Match the string against rules in given ancestors context. The _`action`_
part of return value is relevant to business logic; `ancestors` are
to be used for the next call if action part is _`DO_CONTINUE`_.

### Constants
See [definitions](src/definitions.js). Action codes defined by application code
should be non-negative integers - this is important!

### Helper functions
**_`loadFile`_**_`(path: string, nicely=: false): * | undefined`_ function

Reads file synchronously and return _`Buffer`_ instance.
If file is not found, then just return _`undefined`_.

Setting _`nicely`_ argument prevents any exception throwing; just Error instance
is returned by function.

**_`typeName`_**_`(type: string): string | undefined`_ function

Translate single-character type id used by _`DirWalker`_ to human-readable string.

## Handler functions
If handler is not arrow function, it's _`this`_ variable will be set to calling
_`DirWalker`_ instance.

The context argument contains following properties:
   * `absDir `- absolute path of the directory to be opened;
   * `depth  `- dept in directory tree (0 for root);
   * `dir    `- local name the directory to be opened ('' for toot itself);
   * `locals `- reserved for application code.
   * `root   `- _`rootDir`_ argument supplied to _`walk()`_ method.
   
Common return codes from handler and their effect:
   * `DO_TERMINATE` - all walking is terminated for this _`DirWalker`_ instance;
   * `DO_ABORT` - discard the current operation, exit to previous level;
   * `DO_SKIP` - skip this item;

**_`onBegin`_**_`(context: object) : *`_

Called before directory is opened. Special effects of return codes:
   * `DO_ABORT` - _walk()_ will return immediately;
   * `DO_SKIP` - skip this directory without trying to open it;

**_`onEntry`_**_`(context: object) : *`_

Called on every entry in the directory. Context has extra fields:
   * `name `- ...of directory entry;
   * `type `- ...of directory entry (one of exported **`T_...`** constants);

If type is `T_DIR`, and handler returns an object, then this object
will be available on this child directory level via _`context.locals`_.

**_`onEnd`_**_`(context: object) : *`_

Called when all _`onEntry`_ calls are done and the directory is closed.

**_`onError`_**_`(error: Error, args: *) : *`_

Called when exception is caught. The following return values have special effect:
   * `undefined` invokes default error processing;
   * `DO_SKIP` prevents registerFailure() from being called.

### Default error processing
Depending on error.code value, the following will happen:
   * `'ENOTDIR'` - error is not logged and DO_SKIP is returned from behalf of failed function;
   * `'EPERM'` - error is logged and execution continues;
   * otherwise it is assumed to be unexpected failure and error will be re-thrown.
   
If exception originates from _`onEnd`_ handler and final code is not _`DO_SKIP`_,
then _`walk()`_ will return immediately.

## Asynchronous operation
There is a demo of asynchronous parallel operation in [examples/list.js](examples/list.js).
It's kinda cool, but in closer look, there is not much benefit - actually -
async mode performance is no better at all. It is natural, because the `walk()` code
_is_ synchronous. So all we'd get from asynchronous operation is being challenged
by lurking _EMFILE_ psycho.

As tempting as writing a fully async version of walk() is, honestly - I can't
see much practical benefit from it. Traversing file system discussing every
file with a remote server might be a good candidate, but... what for?

All ideas, cooperation, rage and criticism will be appreciated!

Be sure to check for this README sometimes via 
[npm](https://www.npmjs.com/package/dwalker) _homepage_ link or directly in github.
I'll restrain myself to
not update [npmjs.com](https://www.npmjs.com) too often. ;)
