## Classes

<dl>
<dt><a href="#Ruler">Ruler</a></dt>
<dd><p>Rule tree and intermediate state of searches.</p>
</dd>
<dt><a href="#Walker">Walker</a></dt>
<dd><p>Walks a directory tree according to rules.</p>
</dd>
</dl>

## Objects

<dl>
<dt><a href="#constants">constants</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#dwalker">dwalker</a> : <code>object</code></dt>
<dd><p>Package exports - members listed below and also the constants.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#actionName">actionName(action, [frmt])</a> ⇒ <code>string</code> | <code>*</code></dt>
<dd><p>Translate action code to human-readable string. For diagnostics only.</p>
</dd>
<dt><a href="#loadFile">loadFile(filePath, mildly)</a> ⇒ <code>undefined</code> | <code>Buffer</code></dt>
<dd><p>Read file synchronously; suppressing missing file (ENOENT) error.</p>
</dd>
<dt><a href="#relativize">relativize(path, [rootPath], [prefix])</a> ⇒ <code>string</code> | <code>*</code></dt>
<dd><p>Strip the CWD part from give <code>path</code>.</p>
</dd>
<dt><a href="#typeName">typeName(type)</a> ⇒ <code>string</code> | <code>undefined</code></dt>
<dd><p>Translate directory entry type code to human-readable type name.</p>
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
<dt><a href="#TEntryType">TEntryType</a> : <code>string</code></dt>
<dd><p>Value of directory entry <code>type</code> property.</p>
</dd>
</dl>

<a name="Ruler"></a>

## Ruler
Rule tree and intermediate state of searches.

**Kind**: global class  

* [Ruler](#Ruler)
    * [new Ruler([options], ...definitions)](#new_Ruler_new)
    * [.ancestors](#Ruler+ancestors) : <code>Array.&lt;Array&gt;</code> \| <code>undefined</code>
    * [.lastMatch](#Ruler+lastMatch) : <code>Array</code> \| <code>undefined</code>
    * [.nextRuleAction](#Ruler+nextRuleAction) : <code>number</code>
    * [.options](#Ruler+options) : <code>Object</code>
    * [.add(...args)](#Ruler+add) ⇒ [<code>Ruler</code>](#Ruler)
    * [.clone([ancestors])](#Ruler+clone) ⇒ [<code>Ruler</code>](#Ruler)
    * [.concat(...args)](#Ruler+concat) ⇒ [<code>Ruler</code>](#Ruler)
    * [.dump(options)](#Ruler+dump) ⇒ <code>string</code> \| <code>undefined</code>
    * [.match(itemName, [itemType])](#Ruler+match) ⇒ <code>Array.&lt;Array&gt;</code>

<a name="new_Ruler_new"></a>

### new Ruler([options], ...definitions)

| Param | Type |
| --- | --- |
| [options] | <code>Object.&lt;{action:number, extended, optimize}&gt;</code> | 
| ...definitions | <code>\*</code> | 

<a name="Ruler+ancestors"></a>

### ruler.ancestors : <code>Array.&lt;Array&gt;</code> \| <code>undefined</code>
Used and mutated by test() method.

**Kind**: instance property of [<code>Ruler</code>](#Ruler)  
<a name="Ruler+lastMatch"></a>

### ruler.lastMatch : <code>Array</code> \| <code>undefined</code>
Most recent result returned by match() method - for debugging.

**Kind**: instance property of [<code>Ruler</code>](#Ruler)  
<a name="Ruler+nextRuleAction"></a>

### ruler.nextRuleAction : <code>number</code>
Action to be bound to next rule - used and possibly mutated by add().

**Kind**: instance property of [<code>Ruler</code>](#Ruler)  
<a name="Ruler+options"></a>

### ruler.options : <code>Object</code>
Options for string parser.

**Kind**: instance property of [<code>Ruler</code>](#Ruler)  
<a name="Ruler+add"></a>

### ruler.add(...args) ⇒ [<code>Ruler</code>](#Ruler)
Add new rules. If the first item in definitions array is not string,
it will be treated as action code, which will prevail over default action.

If `definition` is an array, then every numeric member will be interpreted as
action code for following rule(s). Array may be nested.

**Kind**: instance method of [<code>Ruler</code>](#Ruler)  

| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>\*</code> | any of {Array|Ruler|number|string} |

<a name="Ruler+clone"></a>

### ruler.clone([ancestors]) ⇒ [<code>Ruler</code>](#Ruler)
Create copy of the instance.

**Kind**: instance method of [<code>Ruler</code>](#Ruler)  

| Param | Type |
| --- | --- |
| [ancestors] | <code>Array</code> | 

<a name="Ruler+concat"></a>

### ruler.concat(...args) ⇒ [<code>Ruler</code>](#Ruler)
Create a new instance with new rules appended.

**Kind**: instance method of [<code>Ruler</code>](#Ruler)  

| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>\*</code> | rule definitions |

<a name="Ruler+dump"></a>

### ruler.dump(options) ⇒ <code>string</code> \| <code>undefined</code>
Create diagnostic dump for visual display.

**Kind**: instance method of [<code>Ruler</code>](#Ruler)  
**Returns**: <code>string</code> \| <code>undefined</code> - NB: always undefined in production mode!  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Array.&lt;string&gt;</code> \| <code>string</code> \| <code>number</code> | which members to show and how. |

<a name="Ruler+match"></a>

### ruler.match(itemName, [itemType]) ⇒ <code>Array.&lt;Array&gt;</code>
Match the `itemName` against rules, without mutating object state.

The results array never contains ROOT node, which will be added
on every run.
If a node of special action is matched, then only this node is returned.

**Kind**: instance method of [<code>Ruler</code>](#Ruler)  
**Returns**: <code>Array.&lt;Array&gt;</code> - array of [action, index]  

| Param | Type | Description |
| --- | --- | --- |
| itemName | <code>string</code> | of item |
| [itemType] | <code>string</code> | of item |

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
        * [.defaultRuler](#Walker+defaultRuler) : <code>\*</code> \| [<code>Ruler</code>](#Ruler)
        * [.failures](#Walker+failures) : <code>Array.&lt;string&gt;</code>
        * [.interval](#Walker+interval) : <code>number</code>
        * [.options](#Walker+options) : <code>Object</code>
        * [.terminate](#Walker+terminate) : <code>boolean</code>
        * [.tick](#Walker+tick) : <code>function</code>
        * [.trace](#Walker+trace) : <code>function</code>
        * [.trees](#Walker+trees) : <code>Array.&lt;{absDir:string}&gt;</code>
        * [.detect(context, action)](#Walker+detect) ⇒ <code>\*</code>
        * [.getCurrent(dir)](#Walker+getCurrent) ⇒ <code>Object</code> \| <code>undefined</code>
        * [.getMaster(dir)](#Walker+getMaster) ⇒ <code>Object</code> \| <code>undefined</code>
        * [.onBegin(context)](#Walker+onBegin) ⇒ <code>number</code> \| <code>\*</code>
        * [.onEnd(context)](#Walker+onEnd) ⇒ <code>\*</code>
        * [.onEntry(context)](#Walker+onEntry) ⇒ <code>Object</code> \| <code>number</code> \| <code>undefined</code>
        * [.onError(errorInstance, context, expected)](#Walker+onError) ⇒ <code>\*</code>
        * [.registerFailure(failure, [comment])](#Walker+registerFailure) ⇒ [<code>Walker</code>](#Walker)
        * [.walk(rootPath, [options])](#Walker+walk) ⇒ <code>Promise.&lt;Array&gt;</code>
        * [.walkSync(rootPath, [options])](#Walker+walkSync) ⇒ <code>Object</code>
    * _static_
        * [.getTotals()](#Walker.getTotals) ⇒ <code>Object</code>
        * [.reset()](#Walker.reset)

<a name="new_Walker_new"></a>

### new Walker([options])

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | all [TWalkOptions](#TWalkOptions) properties, plus initial values for appropriate instance properties: |

<a name="Walker+defaultRuler"></a>

### walker.defaultRuler : <code>\*</code> \| [<code>Ruler</code>](#Ruler)
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

### walker.trees : <code>Array.&lt;{absDir:string}&gt;</code>
Descriptors of recognized filesystem subtrees.

**Kind**: instance property of [<code>Walker</code>](#Walker)  
<a name="Walker+detect"></a>

### walker.detect(context, action) ⇒ <code>\*</code>
Check if the current directory should be recognized as special and
if it does then assign new values to `context.current` and `context.ruler`.
NB: in most cases, this method should _not_ be called from overriding one!

**Kind**: instance method of [<code>Walker</code>](#Walker)  
**Returns**: <code>\*</code> - - a truey value on positive detection.  

| Param | Type | Description |
| --- | --- | --- |
| context | [<code>TWalkContext</code>](#TWalkContext) |  |
| action | <code>number</code> \| <code>undefined</code> | set by dir entry rule (missing at root). |

<a name="Walker+getCurrent"></a>

### walker.getCurrent(dir) ⇒ <code>Object</code> \| <code>undefined</code>
Get descriptor for the current directory if it was recognized.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type |
| --- | --- |
| dir | <code>string</code> | 

<a name="Walker+getMaster"></a>

### walker.getMaster(dir) ⇒ <code>Object</code> \| <code>undefined</code>
Find tree above the current directory.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type |
| --- | --- |
| dir | <code>string</code> | 

<a name="Walker+onBegin"></a>

### walker.onBegin(context) ⇒ <code>number</code> \| <code>\*</code>
Handler called after new directory was successfully opened.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type | Description |
| --- | --- | --- |
| context | [<code>TWalkContext</code>](#TWalkContext) | may have it's `action` property set! |

<a name="Walker+onEnd"></a>

### walker.onEnd(context) ⇒ <code>\*</code>
Handler called when done with current directory.

**Kind**: instance method of [<code>Walker</code>](#Walker)  

| Param | Type | Description |
| --- | --- | --- |
| context | [<code>TWalkContext</code>](#TWalkContext) | has `action` set by onBegin or last onEntry. |

<a name="Walker+onEntry"></a>

### walker.onEntry(context) ⇒ <code>Object</code> \| <code>number</code> \| <code>undefined</code>
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

### walker.walk(rootPath, [options]) ⇒ <code>Promise.&lt;Array&gt;</code>
Process directory tree asynchronously width-first starting from `rootPath`
 and invoke appropriate onXxx method.

**Kind**: instance method of [<code>Walker</code>](#Walker)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - the first item is data returned by walkSync().  

| Param | Type |
| --- | --- |
| rootPath | <code>string</code> | 
| [options] | [<code>TWalkOptions</code>](#TWalkOptions) | 

<a name="Walker+walkSync"></a>

### walker.walkSync(rootPath, [options]) ⇒ <code>Object</code>
Process directory tree synchronously width-first starting from `rootPath`
 and invoke appropriate onXxx methods.

**Kind**: instance method of [<code>Walker</code>](#Walker)  
**Returns**: <code>Object</code> - 'data` member of internal context.  

| Param | Type |
| --- | --- |
| rootPath | <code>string</code> | 
| [options] | [<code>TWalkOptions</code>](#TWalkOptions) | 

<a name="Walker.getTotals"></a>

### Walker.getTotals() ⇒ <code>Object</code>
Get total counts.

**Kind**: static method of [<code>Walker</code>](#Walker)  
<a name="Walker.reset"></a>

### Walker.reset()
Reset counters for getTotals().

**Kind**: static method of [<code>Walker</code>](#Walker)  
<a name="constants"></a>

## constants : <code>object</code>
**Kind**: global namespace  

* [constants](#constants) : <code>object</code>
    * [.DO_SKIP](#constants.DO_SKIP) : <code>number</code>
    * [.DO_ABORT](#constants.DO_ABORT) : <code>number</code>
    * [.DO_TERMINATE](#constants.DO_TERMINATE) : <code>number</code>
    * [.T_ANY](#constants.T_ANY) : [<code>TEntryType</code>](#TEntryType)
    * [.T_BLOCK](#constants.T_BLOCK) : [<code>TEntryType</code>](#TEntryType)
    * [.T_CHAR](#constants.T_CHAR) : [<code>TEntryType</code>](#TEntryType)
    * [.T_DIR](#constants.T_DIR) : [<code>TEntryType</code>](#TEntryType)
    * [.T_FIFO](#constants.T_FIFO) : [<code>TEntryType</code>](#TEntryType)
    * [.T_FILE](#constants.T_FILE) : [<code>TEntryType</code>](#TEntryType)
    * [.T_SOCKET](#constants.T_SOCKET) : [<code>TEntryType</code>](#TEntryType)
    * [.T_SYMLINK](#constants.T_SYMLINK) : [<code>TEntryType</code>](#TEntryType)

<a name="constants.DO_SKIP"></a>

### constants.DO\_SKIP : <code>number</code>
Action code: skip this directory entry.

**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.DO_ABORT"></a>

### constants.DO\_ABORT : <code>number</code>
Action code: Discard all in current directory.

**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.DO_TERMINATE"></a>

### constants.DO\_TERMINATE : <code>number</code>
Action code: Discard all in current directory; terminate all walking.

**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.T_ANY"></a>

### constants.T\_ANY : [<code>TEntryType</code>](#TEntryType)
**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.T_BLOCK"></a>

### constants.T\_BLOCK : [<code>TEntryType</code>](#TEntryType)
**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.T_CHAR"></a>

### constants.T\_CHAR : [<code>TEntryType</code>](#TEntryType)
**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.T_DIR"></a>

### constants.T\_DIR : [<code>TEntryType</code>](#TEntryType)
**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.T_FIFO"></a>

### constants.T\_FIFO : [<code>TEntryType</code>](#TEntryType)
**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.T_FILE"></a>

### constants.T\_FILE : [<code>TEntryType</code>](#TEntryType)
**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.T_SOCKET"></a>

### constants.T\_SOCKET : [<code>TEntryType</code>](#TEntryType)
**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.T_SYMLINK"></a>

### constants.T\_SYMLINK : [<code>TEntryType</code>](#TEntryType)
**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="dwalker"></a>

## dwalker : <code>object</code>
Package exports - members listed below and also the constants.

**Kind**: global namespace  
**Mixes**: [<code>constants</code>](#constants)  

* [dwalker](#dwalker) : <code>object</code>
    * [.Ruler](#dwalker.Ruler)
    * [.Walker](#dwalker.Walker)
    * [.actionName](#dwalker.actionName)
    * [.loadFile](#dwalker.loadFile)
    * [.relativize](#dwalker.relativize)
    * [.typeName](#dwalker.typeName)

<a name="dwalker.Ruler"></a>

### dwalker.Ruler
**Kind**: static property of [<code>dwalker</code>](#dwalker)  
**See**: [Ruler](#Ruler)  
<a name="dwalker.Walker"></a>

### dwalker.Walker
**Kind**: static property of [<code>dwalker</code>](#dwalker)  
**See**: [Walker](#Walker)  
<a name="dwalker.actionName"></a>

### dwalker.actionName
**Kind**: static property of [<code>dwalker</code>](#dwalker)  
**See**: [actionName](#actionName)  
<a name="dwalker.loadFile"></a>

### dwalker.loadFile
**Kind**: static property of [<code>dwalker</code>](#dwalker)  
**See**: [loadFile](#loadFile)  
<a name="dwalker.relativize"></a>

### dwalker.relativize
**Kind**: static property of [<code>dwalker</code>](#dwalker)  
**See**: [relativize](#relativize)  
<a name="dwalker.typeName"></a>

### dwalker.typeName
**Kind**: static property of [<code>dwalker</code>](#dwalker)  
**See**: [typeName](#typeName)  
<a name="actionName"></a>

## actionName(action, [frmt]) ⇒ <code>string</code> \| <code>\*</code>
Translate action code to human-readable string. For diagnostics only.

**Kind**: global function  

| Param | Type |
| --- | --- |
| action | <code>number</code> | 
| [frmt] | <code>string</code> | 

<a name="loadFile"></a>

## loadFile(filePath, mildly) ⇒ <code>undefined</code> \| <code>Buffer</code>
Read file synchronously; suppressing missing file (ENOENT) error.

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| filePath | <code>string</code> |  |  |
| mildly | <code>boolean</code> | <code>false</code> | return error object instead of throwing it. |

<a name="relativize"></a>

## relativize(path, [rootPath], [prefix]) ⇒ <code>string</code> \| <code>\*</code>
Strip the CWD part from give `path`.

**Kind**: global function  
**Throws**:

- <code>Error</code> on ambiguous `rootPath` and `prefix` combination.


| Param | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | absolute path. |
| [rootPath] | <code>string</code> | defaults to user's home directory. |
| [prefix] | <code>string</code> | for relative path. |

<a name="typeName"></a>

## typeName(type) ⇒ <code>string</code> \| <code>undefined</code>
Translate directory entry type code to human-readable type name.

**Kind**: global function  

| Param | Type |
| --- | --- |
| type | [<code>TEntryType</code>](#TEntryType) | 

<a name="TWalkContext"></a>

## TWalkContext : <code>Object</code>
Data context [walkSync](#Walker+walkSync) provides handler methods / plugins with.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| absDir | <code>string</code> | separator-terminated absolute path |
| action | <code>number</code> | from previous or upper (for onBegin) handler. |
| current | <code>Object</code> | entry in [Ruler#trees](Ruler#trees). |
| data | <code>\*</code> | to be returned by [walkSync](#Walker+walkSync) method. |
| depth | <code>number</code> | 0 for `rootDir`. |
| detect | <code>function</code> | plugin or instance method. |
| dir | <code>string</code> | relative to `rootDir`. |
| master | <code>Object</code> | entry in [Ruler#trees](Ruler#trees). |
| name | <code>string</code> | of directory entry (onEntry only) |
| rootDir | <code>string</code> | absolute path where walking started from. |
| ruler | [<code>Ruler</code>](#Ruler) | currently active ruler instance. |
| type | [<code>TEntryType</code>](#TEntryType) | of directory entry (onEntry only) |

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

<a name="TEntryType"></a>

## TEntryType : <code>string</code>
Value of directory entry `type` property.

**Kind**: global typedef  