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
