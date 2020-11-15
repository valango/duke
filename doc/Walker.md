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
    * [.getCurrent(dir)](#Walker+getCurrent) ⇒ <code>Object</code> \| <code>undefined</code>
    * [.getTotals()](#Walker+getTotals) ⇒ <code>Object.&lt;{entries: number}&gt;</code>
    * [.onDir(context)](#Walker+onDir) ⇒ <code>\*</code>
    * [.onEntry(name, type, context)](#Walker+onEntry) ⇒ <code>number</code>
    * [.onFinal(context)](#Walker+onFinal) ⇒ <code>Promise.&lt;number&gt;</code>
    * [.onError(error)](#Walker+onError) ⇒ <code>number</code> \| <code>Error</code> \| <code>undefined</code>
    * [.reset()](#Walker+reset) ⇒ [<code>Walker</code>](#Walker)
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
Minimum milliseconds between [Walker#tick](Walker#tick) calls (default: 200).

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
<a name="Walker+getCurrent"></a>

### walker.getCurrent(dir) ⇒ <code>Object</code> \| <code>undefined</code>
Get descriptor for the current directory if it was recognized.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type |
| --- | --- |
| dir | <code>string</code> | 

<a name="Walker+getTotals"></a>

### walker.getTotals() ⇒ <code>Object.&lt;{entries: number}&gt;</code>
Get total counts.

**Kind**: instance method of [<code>Walker</code>](#Walker)  
<a name="Walker+onDir"></a>

### walker.onDir(context) ⇒ <code>\*</code>
Handler called immediately after directory has been opened.

**Kind**: instance method of [<code>Walker</code>](#Walker)  
**Returns**: <code>\*</code> - numeric action code or special value to for `visited` collection.  

| Param | Type |
| --- | --- |
| context | <code>TWalkContext</code> | 

<a name="Walker+onEntry"></a>

### walker.onEntry(name, type, context) ⇒ <code>number</code>
Handler called for every directory entry.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type |
| --- | --- |
| name | <code>string</code> | 
| type | <code>TEntryType</code> | 
| context | <code>TWalkContext</code> | 

<a name="Walker+onFinal"></a>

### walker.onFinal(context) ⇒ <code>Promise.&lt;number&gt;</code>
Handler called after all entries been scanned and directory closed.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type |
| --- | --- |
| context | <code>TWalkContext</code> | 

<a name="Walker+onError"></a>

### walker.onError(error) ⇒ <code>number</code> \| <code>Error</code> \| <code>undefined</code>
Translate error if applicable.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | with `context` property set. |

<a name="Walker+reset"></a>

### walker.reset() ⇒ [<code>Walker</code>](#Walker)
Reset counters for getTotals().

**Kind**: instance method of [<code>Walker</code>](#Walker)  
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
