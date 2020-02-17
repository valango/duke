## Classes

<dl>
<dt><a href="#Walker">Walker</a></dt>
<dd><p>Walks a directory tree according to rules.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#TWalkContext">TWalkContext</a> : <code>Object</code></dt>
<dd><p>Data context <a href="#Walker+walkSync">walkSync</a> provides handler methods / plugins with.</p>
</dd>
<dt><a href="#TWalkOptions">TWalkOptions</a> : <code>Object</code></dt>
<dd><p>Options for Walker#walk...() instance methods and constructor.</p>
</dd>
</dl>

<a name="Walker"></a>

## Walker
Walks a directory tree according to rules.

**Kind**: global class  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| defaultRuler | <code>\*</code> |  |
| interval | <code>number</code> | msecs between tick plugin calls |
| tick | <code>function</code> | plugin |
| trace | <code>function</code> | plugin |


* [Walker](#Walker)
    * [new Walker([options])](#new_Walker_new)
    * _instance_
        * [.defaultRuler](#Walker+defaultRuler) : <code>\*</code> \| <code>Ruler</code>
        * [.failures](#Walker+failures) : <code>Array.&lt;string&gt;</code>
        * [.interval](#Walker+interval) : <code>number</code>
        * [.options](#Walker+options) : <code>Object</code>
        * [.terminate](#Walker+terminate) : <code>boolean</code>
        * [.tick](#Walker+tick) : <code>function</code>
        * [.trace](#Walker+trace) : <code>function</code>
        * [.trees](#Walker+trees) : <code>Array.&lt;{Object}&gt;</code>
        * [.detect(context)](#Walker+detect) ⇒ <code>\*</code>
        * [.getCurrent(dir)](#Walker+getCurrent) ⇒ <code>Object</code> \| <code>undefined</code>
        * [.onBegin(context)](#Walker+onBegin) ⇒ <code>number</code>
        * [.onEnd(context)](#Walker+onEnd) ⇒ <code>number</code>
        * [.onEntry(context)](#Walker+onEntry) ⇒ <code>number</code>
        * [.onError(errorInstance, context, expected)](#Walker+onError) ⇒ <code>\*</code>
        * [.registerFailure(failure, [comment])](#Walker+registerFailure) ⇒ [<code>Walker</code>](#Walker)
        * [.walk(rootPath, [walkOptions])](#Walker+walk) ⇒ <code>Promise.&lt;Array&gt;</code>
        * [.walkSync(rootPath, [walkOptions])](#Walker+walkSync) ⇒ <code>Object</code>
    * _static_
        * [.getTotals()](#Walker.getTotals) ⇒ <code>Object</code>
        * [.reset()](#Walker.reset)

<a name="new_Walker_new"></a>

### new Walker([options])

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | all [TWalkOptions](#TWalkOptions) properties, plus initial values for appropriate instance properties: |

<a name="Walker+defaultRuler"></a>

### walker.defaultRuler : <code>\*</code> \| <code>Ruler</code>
Default Ruler instance to be used until detect() finds something special.

**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+failures"></a>

### walker.failures : <code>Array.&lt;string&gt;</code>
Array of error messages from suppressed exceptions.

**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+interval"></a>

### walker.interval : <code>number</code>
Minimum interval between [tick](#Walker+tick) calls.

**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+options"></a>

### walker.options : <code>Object</code>
Options to be applied to walkSync() by default.

**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+terminate"></a>

### walker.terminate : <code>boolean</code>
When true, walking will terminate immediately.

**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+tick"></a>

### walker.tick : <code>function</code>
Function to be called approximately periodically while walking
with (entriesTotal, directoriesTotal) as arguments.

**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+trace"></a>

### walker.trace : <code>function</code>
Tracer plugin function called after every handler with
(handlerName, context, action).
A pseudo name 'noOpen' is used after opendir failure.

**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+trees"></a>

### walker.trees : <code>Array.&lt;{Object}&gt;</code>
Descriptors of recognized filesystem subtrees.

**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+detect"></a>

### walker.detect(context) ⇒ <code>\*</code>
Check if the current directory should be recognized as special and
if it does then assign new values to `context.current` and `context.ruler`.
Probably the `context.current` should be added to `trees`, to.
NB: in most cases, this method should _not_ be called from overriding one!

**Kind**: instance method of [<code>Walker</code>](#Walker)  
**Returns**: <code>\*</code> - - non-numeric value has no effect on Walker#onBegin.  

| Param | Type |
| --- | --- |
| context | [<code>TWalkContext</code>](#TWalkContext) | 

<a name="Walker+getCurrent"></a>

### walker.getCurrent(dir) ⇒ <code>Object</code> \| <code>undefined</code>
Get descriptor for the current directory if it was recognized.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type |
| --- | --- |
| dir | <code>string</code> | 

<a name="Walker+onBegin"></a>

### walker.onBegin(context) ⇒ <code>number</code>
Handler called after new directory was successfully opened.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type |
| --- | --- |
| context | [<code>TWalkContext</code>](#TWalkContext) | 

<a name="Walker+onEnd"></a>

### walker.onEnd(context) ⇒ <code>number</code>
Handler called when done with current directory.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type | Description |
| --- | --- | --- |
| context | [<code>TWalkContext</code>](#TWalkContext) | has `action` from `onBegin` or last `onEntry`. |

<a name="Walker+onEntry"></a>

### walker.onEntry(context) ⇒ <code>number</code>
Handler called for every directory entry.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type | Description |
| --- | --- | --- |
| context | [<code>TWalkContext</code>](#TWalkContext) | has `name` and `type` properties set. |

<a name="Walker+onError"></a>

### walker.onError(errorInstance, context, expected) ⇒ <code>\*</code>
Handler called when error gets trapped.

**Kind**: instance method of [<code>Walker</code>](#Walker)  
**Returns**: <code>\*</code> - - undefined: do default handling;
 - Error instance: treat this as unrecoverable
 - other: DO_SKIP, DO_ABORT, DO_TERMINATE  

| Param | Type | Description |
| --- | --- | --- |
| errorInstance | <code>Error</code> |  |
| context | <code>\*</code> |  |
| expected | <code>Object</code> | resulting actions keyed by error code. |

<a name="Walker+registerFailure"></a>

### walker.registerFailure(failure, [comment]) ⇒ [<code>Walker</code>](#Walker)
Accumulate all kind of stuff into `failures` array to be enjoyed
when the walk is over.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type | Description |
| --- | --- | --- |
| failure | <code>\*</code> | presumably error instance or string. |
| [comment] | <code>string</code> | if present, will be added with newline. |

<a name="Walker+walk"></a>

### walker.walk(rootPath, [walkOptions]) ⇒ <code>Promise.&lt;Array&gt;</code>
Process directory tree asynchronously width-first starting from `rootPath`
 and invoke appropriate onXxx method.

**Kind**: instance method of [<code>Walker</code>](#Walker)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - the first item is data returned by walkSync().  

| Param | Type |
| --- | --- |
| rootPath | <code>string</code> | 
| [walkOptions] | [<code>TWalkOptions</code>](#TWalkOptions) | 

<a name="Walker+walkSync"></a>

### walker.walkSync(rootPath, [walkOptions]) ⇒ <code>Object</code>
Process directory tree synchronously width-first starting from `rootPath`
 and invoke appropriate onXxx methods.

**Kind**: instance method of [<code>Walker</code>](#Walker)  
**Returns**: <code>Object</code> - 'data` member of internal context.  

| Param | Type |
| --- | --- |
| rootPath | <code>string</code> | 
| [walkOptions] | [<code>TWalkOptions</code>](#TWalkOptions) | 

<a name="Walker.getTotals"></a>

### Walker.getTotals() ⇒ <code>Object</code>
Get total counts.

**Kind**: static method of [<code>Walker</code>](#Walker)  
<a name="Walker.reset"></a>

### Walker.reset()
Reset counters for getTotals().

**Kind**: static method of [<code>Walker</code>](#Walker)  
<a name="TWalkContext"></a>

## TWalkContext : <code>Object</code>
Data context [walkSync](#Walker+walkSync) provides handler methods / plugins with.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| absDir | <code>string</code> | separator-terminated absolute path |
| current | <code>Object</code> | entry in [trees](#Walker+trees). |
| data | <code>\*</code> | to be returned by [walkSync](#Walker+walkSync) method. |
| depth | <code>number</code> | 0 for `rootDir`. |
| detect | <code>function</code> | plugin or instance method. |
| dir | <code>string</code> | relative to `rootDir`. |
| name | <code>string</code> | of directory entry (onEntry only) |
| rootDir | <code>string</code> | absolute path where walking started from. |
| ruler | <code>Ruler</code> | currently active Ruler instance. |
| type | <code>TEntryType</code> | of directory entry (onEntry only) |

<a name="TWalkOptions"></a>

## TWalkOptions : <code>Object</code>
Options for Walker#walk...() instance methods and constructor.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| data | <code>\*</code> | to be shared between handlers. |
| detect | <code>function</code> | plugin |
| onBegin | <code>function</code> | plugin |
| onEnd | <code>function</code> | plugin |
| onEntry | <code>function</code> | plugin |
| onError | <code>function</code> | plugin |
| promises | <code>Array.&lt;Promise&gt;</code> | for async walk() method only. |

