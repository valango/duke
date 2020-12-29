## Walker concepts

_**Walk**_ is a code execution sequence lasting from _`walk(startDirectory)`_ method call 
until settling the _Promise_. The _Walk_ embraces the file system sub-tree from the
_`startDirectory`_ down and ends, when:
   1. all the sub-tree items get processed, or
   1. an exception w/o applicable override occurs, or
   1. any Handler returns a [special value](#return-values).

_**Batch**_ is any number of simultaneous _Walks_ sharing the same _`Walker`_ instance.

_**Thread**_ is any incomplete asynchronous code execution sequence inside a _Walk_.

_**Data**_ is accessible to all _Handlers_ of the _Walk_.
If _`walk()`_ _`options.data`_  is not defined, an empty array will be used.

_**Promise**_ _resolves_ to _Data_ or to the first non-numeric value returned by
_Handler_, or _rejects_ to an error, if such can't be overridden.
Settling a _Promise_ sets an _LTC_ for all other _Threads_.

_**Context**_ is a data of [`TDirContext` type](../src/typedefs.js) describing the _Thread_ state. 
Among many other things, it contains the _Data_ reference.
The _Context_ modifications will affect all oncoming sub-walks down from the current directory.

_**S**hared **T**erminal **C**ondition_ <a name="stc">occurs</a> after the `DO_HALT` action code, or 
an unexpected exception occurs. 
_STC_ is set by calling the _`halt()`_ instance method. 
On _STC_, all active _Walks_ will terminate, resolving to their _Data_.

_**L**ocal **T**erminal **C**ondition_ <a name="ltc">occurs</a> when any _Handler_ returns
the `DO_TERMINATE` action code, or a non-numerical value.

_**Handler**_ is an optional _`walk()`_ argument or _`Walker`_ 
instance method (_`onDir`_, _`onEntry`_, _`onFinal`_).
_Handler_ usually returns an _Action_ code.

_**Action**_ code is a numeric value returned by _Handler_. 
Some (`DO_SKIP`, `DO_ABORT`, `DO_RETRY`, `DO_TERMINATE`) have special meaning for _`Walker`_.

## The walk algorithm
Here is a simplified _synchronous_ pseudocode the _`Walker`_ runs after _`walk()`_ method call:
```javascript
  fifo.put(createDirContext(startDirectory, walkOptions))

  while ((context = fifo.get()) !== undefined) {
    if (!visited.had(context.dirPath)) {
      visited.set(context.dirPath, context.current = {})
      if (isSpecial(result = onDir(context))) break

      for (const entry of (entries = openDirectory(context.dirPath))) {
        //  The Walker#onEntry() calls context.ruler.check(entry),
        //  mutating entry.action and entry.matched and returning the action code.
        if (isSpecial(result = onEntry(entry, context))) break
      }
      closeDirectory(entries)

      if (isSpecial(result)) break

      for (const entry of entries.filter(({action, type}) => type === T_DIR && action < DO_SKIP)) {
        fifo.put(context.clone({
          dirPath: join(context.dirPath, entry.name), 
          ruler: context.ruler.clone(entry.matched)   // Inherit the rules tree traversal status.
        }))
      }

      if (isSpecial(result = onFinal(context, entries, result))) break
    }
  }
```
For the sake of simplicity, few important things weren't shown in the code above:
   1. All calls that may fail, are made via special wrappers taking care of
   [exceptions handling](../README.md#exceptions-handling),
   and possibly setting up the [_LTC_](#ltc) or [_STC_](#stc); then
   1. the _`trace()`_ instance method is called; and
   1. if the initial call was a success, _`context.locus`_ containing the method name, 
   is assigned to _`context.done`_.

## Handlers
The handler functions _`onDir`_, _`onEntry`_ and _`onFinal`_ are _`Walker`_ instance methods.
Their temporary overrides can be injected via _`walk()`_ method options.
In both cases, the Walker will actually get them from _`context` properties_.

When writing your own handlers, be sure to call the original class method first!

**`onDir`**`(context: TDirContext) : *` - _async_ **handler** method<br />
Called before opening the directory. Default just returns `DO_NOTHING`.

**`onEntry`**`(entry: TDirEntry, context: TDirContext) : *` - **handler** method<br />
Called for every entry in the current directory. Default calls _`context.ruler.check()`_,
stores the results it the entry instance and also returns the _`check()`_ return value.
This is the only place, where the _`Walker`_ actually checks
the [rules](../README.md#rule-system).

_**NB:** this is the only _synchronous_ handler - definitely no place for any time-consuming
or I/O operations._

**`onFinal`**`(entries : TDirEntry[], context: TDirContext, action : number) : *` - _async_ **handler** method<br />
Called after all entries checked and directory closed.
The _`action`_ is the highest action code returned by previous handlers walking this directory.
The entries also contain the rules checking information.

_**NB:** In the case of several sub-directories, the onFinal calling order is unpredictable.
It is also likely, that sub-walks are in progress already, when it happens._

### Context argument

The [`context : TDirContext` argument](../src/typedefs.js) provided to these handlers has some members of special importance:
   * **_`data`_** should be used as a common namespace for the current walk (launched by _`walk()`_ call).
   It is a good place to store the finalized data from file system.
   You may provide this value via walk() options. Without this option, the data will be a separate
   array for every walk() call.
   * **_`dirPath`_** is the current directory absolute path.
   * **_`current`_** is the object value held in the internal dictionary of visited directories. It is empty,
   but application code may use it in any possible way.
   * **_`project`_** is for application use. Its value inherits to sub-directories contexts.
   
### Return values
Some **_numeric action codes_** have special effect on Walker operation:
   * **_`DO_ABORT`_** terminates walking of the current directory and its subdirectories. Fas no effect from onFinal.
   * **_`DO_HALT`_** will terminate all walks in progress and will set up the halt condition,
   disabling the _`Walker`_ instance until _`reset()`_ is called.
   * **_`DO_RETRY`_** the current directory walk will be resumed later from the same point.
   This is the default override for `EMFILE` (_out of file handles_) exception, when opening a directory.
   * **_`DO_SKIP`_** has effect from onEntry only and results the current directory entry to be ignored.
   
_**Error instance**_ returned is equivalent to it to bne thrown - the result depends on error how this
particular error handles by _override rules_ ands _`onError()`_ instance method.

_Any **other non-numeric** value_ cases the walk to terminate and resolve to this value, terminating
other sub-walks in progress.
   
   


