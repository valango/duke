## Walker concepts

_**Walk**_ is a code execution sequence lasting from _`walk()`_ method call 
until settling the _Promise_.

_**Batch**_ is any number of simultaneous _Walks_ sharing the same _`Walker`_ instance.

_**Thread**_ is any incomplete asynchronous code execution sequence inside a _Walk_.

_**Data**_ is accessible to all _Handlers_ of the _Walk_.
If _`walk()`_ _`options.data`_  is not defined, then _`data`_ instance property is used.

_**Promise**_ _resolves_ to _Data_ or to the first non-numeric value returned by
_Handler_, or _rejects_ to an error, if such can't be overridden.
Settling a _Promise_ sets an _LTC_ for other _Threads_.

_**Context**_ is a data object describing the state of the _Thread_. 
It contains _Data_ reference.

_**S**hared **T**erminal **C**ondition_ occurs after an `DO_TERMINATE` action or 
unhandled exception from _Handler_ is encountered in a _Thread_. 
_STC_ is set by setting the _`halted`_ instance property to _Data_. 
On _STC_, all _Promises_ resolve to their _Data_.

_**L**ocal **T**erminal **C**ondition_ occurs when _`resolve()`_ or _`reject()`_ 
is called on _Promise_. On _LTC_, all the _Threads_ must terminate.

_**Handler**_ is an optional _`walk()`_ argument or _`Walker`_ 
instance method (_`onDir`_, _`onEntry`_, _`onError`_, _`onFinal`_).
_Handler_ usually returns an _Action_ code.

_**Action**_ code is a numeric value returned by _Handler_. 
Some (`DO_SKIP`, `DO_ABORT`, `DO_RETRY`, `DO_TERMINATE`) have special meaning for _`Walker`_.

## Handler details
The handler functions _`onDir`_, _`onEntry`_ and _`onFinal`_ may be Walker instance methods or
may be injected via _`walk()`_ method options. The onEntry must be synchronous function.

### Context argument

The context argument always provided for these handlers has some members of special importance:
   * data should be used as a common namespace for the current walk (launched by _`walk()`_ call).
   It is a good place to store the finalized data from file system.
   You may provide this value via walk() options. Without this option, the data will be a separate
   array for every walk() call.
   * dirPath is the current directory absolute path.
   * current is the object value held in the internal dictionary of visited directories. It is empty,
   but application code may use it in any possible way.
   * project is for application use. Its value inherits to sub-directories contexts.
   
### Return values
Some **_numeric action codes_** have special effect on Walker operation:
   * DO_ABORT terminates walking of the current directory and its subdirectories. Fas no effect from onFinal.
   * DO_HALT will terminate all walks in progress and will set up the halt condition disabling the Walker instance
   until reset() is called.
   * DO_SKIP has effect from onEntry only and results the current directory entry to be ignored.
   
_**Error instance**_ returned is equivalent to it to bne thrown - the result depends on error how this
particular error handles by _override rules_ ands _`onError()`_ instance method.

_**Any other non-numeric value**_ cases the walk to terminate and resolve to this value, terminating
other sub-walks in progress.
   
   


