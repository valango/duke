# dwalker [![Build Status](https://travis-ci.org/valango/duke.svg?branch=master)](https://travis-ci.org/valango/duke) [![Code coverage](https://codecov.io/gh/valango/duke/branch/master/graph/badge.svg)](https://codecov.io/gh/valango/duke)

![](assets/quote.png)

Rule-based file directory walker - ambitious alternative to globber-based directory walkers.

The version 5 is a whole new beast, with cleaner API by magnitude faster than the previous version.

## Mission
Once I decided to write an utility for managing multiple _npm_ projects
(I have close to 100 on my hard disk and sometimes I'm feeling lost).

My first challenge was to implement a listing functionality able to identify
identical or similar modules used in different projects according to search criteria specified. 
I wanted something like this:
![](assets/xfeed.png)
![](assets/listing.png)
In example above it says `src/lib/debug/index.js` is exactly the same in `sudoku` and 
`intuit2` projects and there's more similar files, but all those are different.

My first try was to use [glob package](https://www.npmjs.com/package/glob),
but soon my code grew horribly complex and inefficient,
because it had so many different things to take care of, while walking the file system:
   1. identify projects, e.g. directories containing more or less proper `package.json` file;
   1. avoid diving into `node_modules/`, `.git/` and similar places;
   1. honor the rules in global and local `.gitignore` files;
   1. optionally process symbolic links;
   1. be selective about projects and components in them accordingly to search rules, etc...

So I decided to write a whole new package that makes all this and similar tasks a piece of cake.

## Overview
The purpose of _**dwalker**_ is to:
   1. provide an extendable rules-based API for file systems traversal and processing;
   1. run fast, making use of asynchronous API;
   1. efficiently support monitoring, diagnostics and debugging.

There are two tasks _dwalker_ takes care of in parallel: 
   * walking the file directory tree and
   * walking the rule tree, which controls how to treat every directory entry.

To manage this, there are two classes, too - **_`Walker`_** and **_`Ruler`_** designed to work together.

_`Walker`_ instance owns at least one _`Ruler`_ instance and may run several walk threads in parallel.
Directories are traversed width-first and Walker has _**handlers**_ - special instance methods for handling basic cases:
   * **`onDir`** invoked after new directory is successfully opened;
   * **`onEntry`** is called for every directory entry - 
   it usually calls Ruler instance's `match(name, type)` method and acts 
   accordingly to resulting _**action code**_.
   * **`onFinal`** is called when all directory entries have been checked and directory closed;
   * **`onError`** is called when exception is trapped, so it may do something special about it.

Often it is not even necessary to derive child classes from Walker,
because you may provide handler overrides right on calling its _`walk()`_ method.

## Usage
**NB:** This package needs Node.js v12.12 or higher.

Install with npm

```
npm i dwalker
```

If you have read this far, take a look at [examples](doc/examples.md).

### How it works
Detailed insight is [here](doc/how-it-works.md).

## API
Detailed documentation is [here](doc/api.md).

Be sure to check for this README sometimes via 
[npm](https://www.npmjs.com/package/dwalker) _homepage_ link or directly in github.
I'll try to
not update [npmjs.com](https://www.npmjs.com) too often. ;)

## Version history
* v4.0.0 @20200218
   - several important fixes;
   - Walker throws error if on illegal action code returned by handler;
   - added: Walker#expectedErrors, removed: Walker#getMaster;
   - added: check(), hadAction(), hasAction() to Ruler, removed: match();
   - up-to-date documentation;
* v3.1.0 @20200217
* v3.0.0 @20200211
* v2.0.0 @20200126
* v1.0.0 @20200124
* v0.8.3 @20200123: first (remotely) airworthy version.
