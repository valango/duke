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

**`execAsync_`**`(functionName, context, ...args) : Promise<*>`<br />
Asynchronous form of _`execSync_()`_. It also handles `DO_RETRY` actions and internal
filesystem API calls.

**`execSync_`**`(functionName, context, ...args)`<br />
Executes context[functionName] and calls _`context.trace()`_.
Then, if there was an exception, calls _`onError_()`_. Returns
a numeric action code computed by _`checkResult_()`_.

**`onError_`**`(error, context, [locusName])`<br />
Calls _`getOverride()`_ and sets up _`error.context`_before calling _`onError()`_ handler.
If _`onError`_ returns a numeric value, it is used as an overriding _action code_ and
the error registers in _`failures`_ instance property. Without an override,
sets _Shared Terminal Condition_ and returns `DO_ABORT`.
