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

How to do this? Just take a look to
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
is re-enterable and it can run in parallel parallel promise instances.

Here is a simplified algorithm:
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
_`onError`_ are all optional but without them,
DirWalker just won't do anything useful.

## API
### Class `DirWalker`
The class instance exposes **_`walk()`_** method, which does all the job.

**_`walk`_**_`(rootDir: string, options=: Object)`_



