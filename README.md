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
_`DirWalker`_ just won't do much useful without them.

Things really get exciting, when we apply some business logic in our handlers.
See [another example](examples/list.js)

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

DirWalker is not directly dependent on this class, but it is designed specially
to work with it, so enjoy!

**_`constructor`_**_`(rules=: *, options=: object)`_

if _`rules`_ is supplied, then _`add()`_ method is invoked. Available _`options`_ are:
   * action: number    - initial value for _`defaultAction`_ property.
   * extended: boolean - enables sets '{a,b}' -> '(a|b)'; default: `true`.
   * optimize: boolean - enables rule optimization; default: `true`.

**_`defaultAction`_**_`: integer`_ property

Action to be bound to new rule. This value is used and possibly mutated by _`add()`_.

**_`add`_**_`(rule: *, action=: number): RuleTree`_ method

Add new rules. If the first item in definitions array is not string,
it will be treated as action code, which will prevail over default action.

If `rule` is an array, then every numeric member will be interpreted as
action code for following rule(s). Array may be nested.

**_`dump`_**_`(): Array<Array>`_ method

Returns clone of the internal rule tree - useful for diagnostics and testing.

**_`match`_**_`(string: string, ancestors=: Array): Array<*>`_ method

The ancestors argument is usually result from another call to _`match()`_.
In most cases, it is far easier to use _`test()`_ method instead.

**_`test`_**_`(string: string, ancestors=: Array): [action, ancestors]`_ method

Match the string against rules in given ancestors context. The _`action`_
part of return value is relevant to business logic; `ancestors` are
to be used for the next call if action part is _`DO_CONTINUE`_.

## Helper functions
**_`loadFile`_**_`(path: string, nicely=: false): * | undefined`_ function

Reads file synchronously and return _`Buffer`_ instance.
If file is not found, then just return _`undefined`_.

Setting _`nicely`_ argument prevents any exception throwing; just Error instance
is returned by function.

**_`typeName`_**_`(type: string): string | undefined`_ function

Translate single-character type id used by _`DirWalker`_ to human-readable string.
