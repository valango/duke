### _`Ruler`_ class
Ruler instances serve for checking directory entries and are usually created and
managed by _`Walker`_.
The class declaration is in [src/Ruler/index.js](../src/Ruler/index.js).

**`constructor`**`([options,] ...rule)`<br />
   * `options.extended : boolean = true` - enable `{...}` syntax by using
   [_`brace-expansion`_](https://github.com/juliangruber/brace-expansion) npm package;
   * `options.optimize : boolean = true`;
   * `rule `- applied to _`add`_ method.
   
The package README describes [how it works](../README.md#rules).

**`add`**`(...definition) : Ruler` - method<br />
The `definition` parameter can be a number, string or array.
A numeric value is an action code for all the rules defined by strings that follow.
Internally, the rules form an _inverted tree_. A definition like 'a/b' will
be check for a matching rule path - if rule for 'a' exists, the 'b' will be added
as its descendant.

For better readability, you can form definitions as arrays - 
`add()` will flatten those internally.
   
**`check`**`(name, [type]) : number` - method<br />
Matches all rules descending from current _`ancestors`_ property against given
name, if _`type`_ is not given or matches the _rule type_.<br >
Returns the highest action value from all matching rules or DO_NOTHING.

**`clone`**`([ancestors]) : Ruler` - method<br />
Create an identical copy of the ruler instance, with _`ancestors`_ property
set to supplied argument - see the [source code](../src/Ruler/index.js) for details.

**`dump`**`([options]) : string` - method<br />
Used for debugging. Returns `undefined` in production environment.

**`lastMatch`**` : number[][]` - property<br />
Gives internal descriptor of all rules matching the most recent _`check()`_ call.
This value applied to _`clone()`_ method serves to implement hierarchic rules.

#### Protected API

**`_ancestors`**` : number[][]` - property<br />
Array of tuples (action, ruleIndex), set by `clone()`.
Only the rules with _ancestor_ matching a _ruleIndex_ in here, will be used by `check()`.

**`_lastMatch`**` : number[][]` - property<br />
Array of tuples (action, ruleIndex) describing which rules did match during the recent `check()` run.
This data is available via _`lastMatch`_ public property.

**`_nextRuleAction`**` : number` - property<br />
Used internally by `add*_()` methods during rule definitions parsing.

**`_options`**` : Object` - property<br />
Rule parsing options provided to constructor.

**`_tree`**` : number[][]` - property<br />
An inverted tree of rules as tuples (entryType, match, parentIndex, actionCode).
The match member is a _`RegExp`_ instance or `null` (matching any directory path).

There are also _`add_(definition)`_, _`addPath_(definition)`_ and _`addRules_(rules, type, action)`_
methods, which may be of interest only when writing derived classes.
