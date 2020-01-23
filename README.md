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

```javascript

```

## Usage
Install with npm

```
npm i dwalker
```

