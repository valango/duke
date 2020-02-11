## API
To make debugging and diagnostics easier, both `Walker` and `Ruler` are 
derived from [`Sincere`](https://www.npmjs.com/package/sincere) base class.

### Class `Walker`
Traverses file system, checking every directory entry for matching rules.

**`constructor([options], [sharedData])`** <br />
`sharedData={} : *` initial value assigned (not copied) to `data`.<br />
`Walker` recognizes the following `options : {object}`:
   * `interval=200 : {number}` milliseconds between `tick()` plug-in calls;
   * `defaultRuler= : {Ruler} | *` rules or Ruler instance for defaultRuler property;
   * `detect : {function()`} plug-in override for `detect` method;
   * `talk : {function()}` used by `talk()` instance method;
   * `tick : {function(number)}` plug-in to be repeatedly called during walking;
   * `onBegin | onEnd | onEntry | onError' | {function(*):*}` - handler plug-ins.

#### Instance properties
**`data`**: `{*}` property <br />
is not used by `Walker`, 
but can be used by plug-ins or derived classes.
This property set to `sharedData` or `{}` by constructor.

**`failures`**: `{Array<string>}` property <br />
Soft error messages; can be examined any time.

**`options`**: `{object}` property <br />
is copy of constructor options. `walkSync()` some methods look here for plug-ins.

**`defaultRuler`**: `{Ruler}` property <br />
`onBegin()` method assigns it to `context.ruler` by default.

**`terminate`**: `{boolean}` property <br />
assigning _Truey_ value prevents any further walking. 
`Walker` sets it `true`, when any `onXXX` handler returns `DO_TERMINATE`.

**`promises`**: `{Array<Promise>}` property <br />
Used by asynchronous `walk()` instance method.

**`trees`**: `{Array<Object>}` property <br />
list of recognized subtrees, e.g. npm projects. `get...()` instance methods assume
array members having `absDir : {string}` property.

#### Instance methods
**`detect(context, action)`**`{*}`  method<br />
Check if the current directory should be recognized as special and
if it does then assign new values to `context.current` and `context.ruler`.
**NB:** in most cases, this method should _not_ be called from overriding one!

**`getCurrent(path)`**`{object}`  method<br />
returns `tree` instance property member with `dirPath === path` or `undefined`.
Called by `Walker.onBegin()` method.

**`getMaster(path)`**`{object}`  method<br />
returns `tree` instance property member with `dirPath` shorter than `path`
and matching it's beginning, or `undefined`.
Called by `Walker.onBegin()` method.

**`onBegin | onEnd | onEntry | onError`**: `{*}` method <br />
If plug-in is defined, it will be called instead of instance method.
Both plug-ins and instance methods semantics is described
in [handlers](#handlers) chapter.

**`registerFailure(failure, [comment])`**: `{Walker}` method<br />
The `failure` should have `stack` or `message` property or default conversion to string.
The resulting string is pushed to `failures` property.
If `comment : {string}` is present, it will be appended to message after `'\n  '` string.

**`talk(...args)`**: `{Walker}` method<br />
executes `options.talk`. For debugging only!

**`walk(rootDir, [options])`**: `{Promise}` method<br />
walks the directory tree asynchronously starting from `rootDir` down.
If `options.locals` is present then it will be assigned to `locals` property of the _top context_.
Returns a promise resolving to _walk context_ or rejecting to un-handled `Error` instance.

**`walkSync(rootDir, [options])`**: `{object}` method<br />
Synchronous version of `walk()` method.
Returns _walk context_ or throws `Error`.

### Default error processing
It may make sense to read about [handlers](#handlers) first and then continue from here.

Depending on `error.code` value, the following will happen:
   * `'ENOTDIR'` - error is not logged and `DO_SKIP` is returned from behalf of failed function;
   * `'EPERM'` - error is logged and execution continues;
   * otherwise it is assumed to be unexpected failure and then:
      * registerFailure() is applied to original arguments of the failed call and then
      to the error instance;
      * DO_ABORT will be returned so this Walker instance finishes walking.
      
Resulting dump of failures property will look something like this:
![](assets/errdump.png)
   
If exception originates from `onEnd` handler and final code is not `DO_SKIP`,
then `walk()` will return immediately.

### Class `Ruler`
_`Walker`_ is not directly dependent on this class, but it is designed specially
to work with it. **NB:** It scans it's rule tree most recently added rules first.

**`constructor([options], [...definitions])`** <br />
calls if `definitions` are supplied, `add()` method  invoked. Available `options` are:
   * `defaultAction : {number}   ` - initial value for `defaultAction` property.
   * `extended : {boolean}` - enables sets '{a,b}' -> '(a|b)'; default: `true`.
   * `optimize : {boolean}` - enables rule optimization; default: `true`.

**`ancestors`**: `{Array<Array>}` property <br />
Affects results of `match()` instance method and is usually set by `clone()` method.

**`lastMatch`**: `{Array<Array>}` property <br />
Is set to results returned by match() instance method. It is there just 
to make debugging easier and has no effect on Ruler itself.

**`nextRuleAction`**: `{integer}` property <br />
default action to be bound to new rule.
This value is used and mutated by `add()` method.

**`add(...args)`**: `{Ruler}` method <br />
adds new rules. Argument may be a number, string, Ruler instance or array of those.
A numeric argument will be treated as action code for further rules and will also
mutate `defaultAction` property.
Rules array may be nested for clarity.
All code lines following example are functionally identical: 
```javascript
r.add(DO_SKIP, 'node_modules', '.*', DO_DEFAULT, '*.js', 'test/*spec.js')
r.add([DO_SKIP, 'node_modules', '.*', DO_DEFAULT, '*.js', 'test/*spec.js'])
r.add(['node_modules', '.*'], DO_SKIP).add([DO_DEFAULT, '*.js', 'test/*spec.js'])
```
The v1.0 syntax `add(definition, action)` is **_deprectated_**

**`clone([ancestors])`**: `{Ruler}` method <br />
Clones the Ruler instance setting it's ancestors property.

**`concat(...definitions)`**: `{Ruler}` method <br />
Clones the Ruler instance and adds new rule definitions.

**`dump([mask])`**: `{string}` method <br />
Creates a pretty-formatted image for debugging. If mask is given, it may be:
   * string: a property name or list of names - used as filter;
   * number: index of of internal rule tree node - used as filter;
   * falsy: disable color codes.
   
**NB:** In _production mode_ this method just returns `undefined`.

**`match(entryName, [entryType])`**: `{Array<*>}` method <br />
does the rule matching using `ancestors` instance property possibly set after
previous matches. To retrieve action code, do: `ruler.match(...)[0][0]`.

### Constants
See [definitions](../src/constants.js). Action codes defined by application code
should be non-negative integers - this is important!

### Helper functions
**`actionName(action)`**: `{string}` function <br />
if `action` is numeric, returns human-readable action name,
otherwise returns `action`. Used for diagnostics.

**`loadFile(filePath, [nicely])`**: `{*}` function <br />
reads file synchronously and returns `Buffer` instance.
Returning `undefined` means the file did not exist.

Setting `nicely : {boolean}` to _truey_ value prevents throwing any exception.
If exception occur, then just `Error` instance is returned by function.

**`relativize(filePath, [rootPath], [prefix])`**: `{string}` function <br />
Opposite to `path.resolve()`. The `rootPath` parameter defaults to user's
home directory. The prefix is prepended to relative path using `path.sep` if necessary.
If `filePath` does not fit the `rootPath`, it is returned as is.

**`typeName(type)`**: `{string | undefined}` function <br />
translates single-character type id used by `Walker` to human-readable string.

## Handlers
Handlers are application-provided callback functions doing the actual work,
leaving just walking to Walker. Handlers van be functions or even class methods.

If handler is not arrow function, it's `this` variable will be set to calling
_`Walker`_ instance.

The context argument supplied to handler contains following properties:
   * `absDir `- absolute path of the directory to be opened;
   * `depth  `- dept in directory tree (0 for root);
   * `dir    `- local name the directory to be opened ('' for toot itself);
   * `locals `- reserved for application code;
   * `root   `- _`rootDir`_ argument supplied to _`walk()`_ method;
   * `ruler  `- a `Ruler` instance.
   
Common return codes from handler and their effect:
   * `DO_TERMINATE` - all walking is terminated for this _`Walker`_ instance;
   * `DO_ABORT` - discard the current operation, exit to previous level;
   * `DO_SKIP` - skip this item;
   
Using `DO_TERMINATE` we can implement `Promise.some()` pattern.

**`onBegin(context)`**: `{*}` handler <br />
is called just after opening a directory, `context.ruler` may be undefined. <br />
Special effects of return codes:
   * `DO_ABORT` - `walk()` will return immediately;
   * `DO_SKIP` - close directory and proceed to `onEnd()`;

**`onEntry(context)`**: `{*}` handler <br />
is called for every entry read from the directory. Context has extra fields:
   * `name `- ...of directory entry;
   * `type `- ...of directory entry (one of exported **`T_...`** constants);

If type is `T_DIR`, and handler returns an object, then this object
will be available on this child directory level via `context.locals`.

**`onEnd(context)`**: `{*}` handler <br />
is called when all `onEntry()` calls are done and the directory is closed.
Context has extra field `action : number` resulting from earlier handler. <br />
`DO_ABORT` return value will finish the walk; other values are ignored.

**`onError(error, args, expected)`** : `{*}` handler <br />
is called when exception is caught with `args : {*}` being arguments originally supplied
to failed function. If error.code is one of `expected : {string[]}` then
`registerFailure()` is called and `DO_SKIP` is returned; otherwise the error will
be thrown, which terminates walking for this instance.
The following return values have special effect:
   * `undefined` invokes default error processing;
   * `DO_SKIP` prevents `registerFailure()` from being called.
