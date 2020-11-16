## Classes

<dl>
<dt><a href="#Walker">Walker</a></dt>
<dd></dd>
</dl>

## Members

<dl>
<dt><a href="#overrides">overrides</a> : <code>Object</code></dt>
<dd><p>Override rules for certain errors in certain locus.</p>
</dd>
</dl>

<a name="Walker"></a>

## Walker
**Kind**: global class  

* [Walker](#Walker)
    * [new Walker([options])](#new_Walker_new)
    * [.failures](#Walker+failures) : <code>Array.&lt;Error&gt;</code>
    * [.interval](#Walker+interval) : <code>number</code>
    * [.ruler](#Walker+ruler) : <code>Ruler</code>
    * [.halted](#Walker+halted) : <code>TWalkContext</code>
    * [.visited](#Walker+visited) : <code>Map</code>
    * [.tick](#Walker+tick) : <code>function</code>
    * [.onDir(context, [currentValue])](#Walker+onDir) ⇒ <code>number</code>
    * [.onEntry(entry, context)](#Walker+onEntry) ⇒ <code>number</code>
    * [.onError(error, context)](#Walker+onError) ⇒ <code>number</code> \| <code>Error</code> \| <code>undefined</code>
    * [.onFinal(entries, context, action)](#Walker+onFinal) ⇒ <code>Promise.&lt;number&gt;</code>
    * [.getParentDir(path)](#Walker+getParentDir) ⇒ <code>string</code> \| <code>undefined</code>
    * [.getStats()](#Walker+getStats) ⇒ <code>TWalkerStats</code>
    * [.reset()](#Walker+reset) ⇒ [<code>Walker</code>](#Walker)
    * [.trace(name, result, context, args)](#Walker+trace)
    * [.walk([startPath], options)](#Walker+walk) ⇒ <code>Promise.&lt;\*&gt;</code>

<a name="new_Walker_new"></a>

### new Walker([options])

| Param | Type |
| --- | --- |
| [options] | <code>TWalkerOptions</code> | 

<a name="Walker+failures"></a>

### walker.failures : <code>Array.&lt;Error&gt;</code>
Array of error instances (with `context` property) from overridden exceptions.

**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+interval"></a>

### walker.interval : <code>number</code>
Minimum milliseconds between [tick](#Walker+tick) calls (default: 200).

**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+ruler"></a>

### walker.ruler : <code>Ruler</code>
**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+halted"></a>

### walker.halted : <code>TWalkContext</code>
Global Terminal Condition, unless undefined.

**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+visited"></a>

### walker.visited : <code>Map</code>
Descriptors of recognized filesystem subtrees.

**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+tick"></a>

### walker.tick : <code>function</code>
**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+onDir"></a>

### walker.onDir(context, [currentValue]) ⇒ <code>number</code>
Handler called immediately after directory has been opened.

**Kind**: instance method of [<code>Walker</code>](#Walker)  
**Returns**: <code>number</code> - numeric action code.  

| Param | Type |
| --- | --- |
| context | <code>TWalkContext</code> | 
| [currentValue] | <code>\*</code> | 

<a name="Walker+onEntry"></a>

### walker.onEntry(entry, context) ⇒ <code>number</code>
Handler called for every directory entry.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type |
| --- | --- |
| entry | <code>TDirEntry</code> | 
| context | <code>TWalkContext</code> | 

<a name="Walker+onError"></a>

### walker.onError(error, context) ⇒ <code>number</code> \| <code>Error</code> \| <code>undefined</code>
Translate error if applicable.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | with `context` property set. |
| context | <code>TWalkContext</code> |  |

<a name="Walker+onFinal"></a>

### walker.onFinal(entries, context, action) ⇒ <code>Promise.&lt;number&gt;</code>
Handler called after all entries been scanned and directory closed.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type | Description |
| --- | --- | --- |
| entries | <code>Array.&lt;TDirEntry&gt;</code> |  |
| context | <code>TWalkContext</code> |  |
| action | <code>number</code> | the most relevant action code from `onEntry`. |

<a name="Walker+getParentDir"></a>

### walker.getParentDir(path) ⇒ <code>string</code> \| <code>undefined</code>
Get parent directory absolute path if such exists in 'visited'.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | must be absolute path terminated by `sep`. |

<a name="Walker+getStats"></a>

### walker.getStats() ⇒ <code>TWalkerStats</code>
Get total counts.

**Kind**: instance method of [<code>Walker</code>](#Walker)  
<a name="Walker+reset"></a>

### walker.reset() ⇒ [<code>Walker</code>](#Walker)
Reset counters for getStats().

**Kind**: instance method of [<code>Walker</code>](#Walker)  
<a name="Walker+trace"></a>

### walker.trace(name, result, context, args)
**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type |
| --- | --- |
| name | <code>string</code> | 
| result | <code>\*</code> | 
| context | <code>TWalkContext</code> | 
| args | <code>Array.&lt;\*&gt;</code> | 

<a name="Walker+walk"></a>

### walker.walk([startPath], options) ⇒ <code>Promise.&lt;\*&gt;</code>
Asynchronously walk a directory tree.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type | Description |
| --- | --- | --- |
| [startPath] | <code>string</code> | defaults to CWD |
| options | <code>TWalkOptions</code> |  |

<a name="overrides"></a>

## overrides : <code>Object</code>
Override rules for certain errors in certain locus.

**Kind**: global variable  
