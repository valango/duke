# dwalker [![Build Status](https://travis-ci.org/valango/duke.svg?branch=master)](https://travis-ci.org/valango/duke) [![Code coverage](https://codecov.io/gh/valango/duke/branch/master/graph/badge.svg)](https://codecov.io/gh/valango/duke)

![](assets/quote.png)

Rule-based file directory walker - ambitious 
alternative to globber-based directory walkers.

**WARNING:** This is _**development** branch_ README and
it may be lagging real bad behind actual codebase changes.

## Mission
Once I decided to write an utility for managing multiple _npm_ projects
(I have close to 100 on my hard disk and sometimes I'm feeling lost).

My first challenge was to implement a listing functionality able to identify
identical or similar modules used in different projects according to search criteria specified. 
I wanted something like this:
![](assets/xfeed.png)
![](assets/listing.png)
In example above it says `src/lib/debug/index.js` is exactly the same in `sudoku` and 
`intuit2` projects and there are more similar files, but they are all different.

My first try was to use [glob package](https://www.npmjs.com/package/glob),
but soon my code grew horribly complex and inefficient,
because it had so many different things to take care of, while walking the file system:
   1. identify projects, e.g. directories containing more or less proper `package.json` file;
   1. avoid diving into `node_modules/`, `.git/` and similar places;
   1. honor the rules in global and local `.gitignore` files;
   1. be selective about projects and components in them accordingly to search rules, etc...

So I decided to write a package that makes all this and similar things a piece of cake.

## Overview
The purpose of _**dwalker**_ is to:
   1. provide an extendable rules-based API for file systems traversal and processing;
   1. support both synchronous and asynchronous / parallel operation;
   1. efficiently support monitoring, diagnostics and debugging.

There are two tasks _dwalker_ takes care of in parallel: 
   * walking the file directory tree and
   * walking the rule tree, which controls how to treat every directory entry.

To manage this, there are two classes - **_`Walker`_** and **_`Ruler`_** designed to work together.

_`Walker`_ instance owns at least one _`Ruler`_ instance and may run several walk threads in parallel.
Directories are traversed width-first and Walker has instance methods for handling basic cases:
   * **`onBegin`** invoked after new directory is successfully opened;
   * **`detect`** usually called by `onBegin` - on recognizing a pattern 
   (like directory is likely being a root of npm project) it may switch rules and 
   do other preparatory stuff for processing this subtree;
   * **`onEntry`** is called for every directory entry - 
   it usually calls Ruler instance's match(name, type) method and acts 
   accordingly to resulting _**action code**_.
   * **`onEnd`** is called after we've done with the directory and it can wrap up some of the results;
   * **`onError`** is called when exception is catched and may implement some specific handling.

Often it is not even necessary to derive child classes from Walker,
because it provides a **_plug-in API_** for overriding most of it's methods.

## Usage
**NB:** This package needs Node.js v12.12 or higher.

Install with npm

```
npm i dwalker
```

If you have read this far, take a look at [examples](examples).

### How it works
Detailed insight is [here](doc/how-it-works.md).

## API
Detailed documentation is [here](doc/api.md).

**_Deprecated:_**
  1. v1.0.1 Ruler instance method call syntax `.add(definition, action)`;
  1. v2.0.0 Ruler constructor `'action'` option - use `'defaultAction'`;
  1. v2.0.0 Walker constructor `'defaultRules'` option - use `'defaultRuler'`;
  
Be sure to check for this README sometimes via 
[npm](https://www.npmjs.com/package/dwalker) _homepage_ link or directly in github.
I'll try to
not update [npmjs.com](https://www.npmjs.com) too often. ;)

## Version history
* v1.0.0 @200124: Lots of improvements + **breaking changes**: class names, action codes.
* v0.8.3 @200123: first airworthy version.
