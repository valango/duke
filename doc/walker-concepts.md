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

_**S**hared **T**erminal **C**ondition_ occurs after the `DO_HALT` action code, or 
an unexpected exception occurs. 
_STC_ is set by calling the _`halt()`_ instance method. 
On _STC_, all active _Walks_ will terminate, resolving to their _Data_.

_**L**ocal **T**erminal **C**ondition_ occurs when any _Handler_ returns
the `DO_TERMINATE` action code, or a non-numerical value.

_**Handler**_ is an optional _`walk()`_ argument or _`Walker`_ 
instance method (_`onDir`_, _`onEntry`_, _`onFinal`_).
_Handler_ usually returns an _Action_ code.

_**Action**_ code is a numeric value returned by _Handler_. 
Some (`DO_SKIP`, `DO_ABORT`, `DO_RETRY`, `DO_TERMINATE`) have special meaning for _`Walker`_.

## Handlers
The handler functions _`onDir`_, _`onEntry`_ and _`onFinal`_ are _`Walker`_ instance methods.
Their temporary overrides can be injected via _`walk()`_ method options.
In both cases, they are available as walk Context properties.

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
   
   


