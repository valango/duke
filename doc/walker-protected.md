## Walker protected API

### Protected properties
   * `_nDirs : number` - available via stats public property;
   * `_nEntries : number` - available via stats public property and as _`tick()`_ argument;
   * `_nErrors : number` - available via stats public property;
   * `_nRetries : number` - available via stats public property;
   * `_nRevoked : number` - available via stats public property;
   * `_nWalks : number` - available via stats public property;
   * `_nextTick : number` - the earliest time for the next tick() call; `NaN` will disable;
   * `_options : Object` - constructor options received;
   * `_useSymLinks : boolean` - enables symbolic links detection;
   * `_visited : Map` - used as a Set of visited directory paths by Walker itself,
   but derived classes may use its values too;
   * `_tStart, _tTotal : bigint` - for computing _`duration`_ property value.
  
### Protected methods

**`checkReturn_`**`(value, context, locusName)`<br />
Checks the value presumably returned by a handler function. It this is `DO_HALT`, then
sets both _Local_ and _Shared Terminal Condition_. If value is not a number type, then
the _Local Terminal Condition_ is set and walk promise will resolve to this value.
Return a numeric action code (`DO_ABORT` if Terminal Condition set).

**`execAsync_`**`(functionName, context, ...args) : Promise<*>`<br />
Asynchronous form of _`execSync_()`_. It also handles `DO_RETRY` actions and internal
filesystem API calls.

**`execSync_`**`(functionName, context, ...args)`<br />
Executes context[functionName] and calls _`context.trace()`_.
Then, if there was an exception, calls _`onError_()`_. Returns
a numeric action code computed by _`checkResult_()`_.

**`onError_`**`(error, context, [locusName])`<br />
Sets the _`error.context`_ and calls _`onError()`_, which should check for a possible override.
If _`onError`_ returns a numeric value, it is considered as an overriding _action code_ and
the error instance is added to _`failures`_ instance property. If error was not overridden,
sets the _Shared Terminal Condition_ and returns `DO_ABORT`.

**`walk_`**`(startPath, options : TWalkOptions, callback : function(error, data))`<br />
Internal implementation of _`walk()`_ method. You should probably never override this one.
