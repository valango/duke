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
| type | <code>TEntryType</code> | 

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
| type | <code>TEntryType</code> | 

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

## Typedefs

<dl>
<dt><a href="#TEntryType">TEntryType</a> : <code>string</code></dt>
<dd><p>Value of directory entry <code>type</code> property.</p>
</dd>
<dt><a href="#TDirEntry">TDirEntry</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#TWalkContext">TWalkContext</a> : <code>Object</code></dt>
<dd><p>Data context <a href="Walker#walk">Walker#walk</a> provides handler methods / plugins with.</p>
</dd>
<dt><a href="#TWalkOptions">TWalkOptions</a> : <code>Object</code></dt>
<dd><p>Options for Walker#walk...() instance methods and constructor.</p>
</dd>
<dt><a href="#TWalkerOptions">TWalkerOptions</a> : <code>Object</code></dt>
<dd><p>Walker constructor options.</p>
</dd>
</dl>

<a name="TEntryType"></a>

## TEntryType : <code>string</code>
Value of directory entry `type` property.

**Kind**: global typedef  
<a name="TDirEntry"></a>

## TDirEntry : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| name | <code>string</code> | 
| type | [<code>TEntryType</code>](#TEntryType) | 

<a name="TWalkContext"></a>

## TWalkContext : <code>Object</code>
Data context [Walker#walk](Walker#walk) provides handler methods / plugins with.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| absPath | <code>string</code> | separator-terminated absolute path |
| current | <code>Object</code> | entry in [Walker#visited](Walker#visited). |
| data | <code>\*</code> | to be returned by [Walker#walk](Walker#walk) method. |
| depth | <code>number</code> | 0 for `rootDir`. |
| entries | <code>Array</code> | available to `onFinal` handler |
| ruler | <code>Ruler</code> | currently active Ruler instance. |

<a name="TWalkOptions"></a>

## TWalkOptions : <code>Object</code>
Options for Walker#walk...() instance methods and constructor.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [data] | <code>\*</code> | to be shared between handlers. |
| [onDir] | <code>function</code> | handler |
| [onEntry] | <code>function</code> | handler |
| [onFinal] | <code>function</code> | handler |
| [tick] | <code>function</code> | handler |
| [trace] | <code>function</code> | handler |
| [ruler] | <code>Ruler</code> | Ruler instance. |

<a name="TWalkerOptions"></a>

## TWalkerOptions : <code>Object</code>
Walker constructor options.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [data] | <code>Object</code> | to be shared between handlers. |
| [interval] | <code>number</code> | minimal interval (ms) between ticks (default: 200). |
| [rules] | <code>\*</code> | ruler instance or rule definitions. |

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

## Typedefs

<dl>
<dt><a href="#TEntryType">TEntryType</a> : <code>string</code></dt>
<dd><p>Value of directory entry <code>type</code> property.</p>
</dd>
<dt><a href="#TDirEntry">TDirEntry</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#TWalkContext">TWalkContext</a> : <code>Object</code></dt>
<dd><p>Data context <a href="Walker#walk">Walker#walk</a> provides handler methods / plugins with.</p>
</dd>
<dt><a href="#TWalkOptions">TWalkOptions</a> : <code>Object</code></dt>
<dd><p>Options for Walker#walk...() instance methods and constructor.</p>
</dd>
<dt><a href="#TWalkerOptions">TWalkerOptions</a> : <code>Object</code></dt>
<dd><p>Walker constructor options.</p>
</dd>
</dl>

<a name="TEntryType"></a>

## TEntryType : <code>string</code>
Value of directory entry `type` property.

**Kind**: global typedef  
<a name="TDirEntry"></a>

## TDirEntry : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| name | <code>string</code> | 
| type | [<code>TEntryType</code>](#TEntryType) | 

<a name="TWalkContext"></a>

## TWalkContext : <code>Object</code>
Data context [Walker#walk](Walker#walk) provides handler methods / plugins with.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| absPath | <code>string</code> | separator-terminated absolute path |
| current | <code>Object</code> | entry in [Walker#visited](Walker#visited). |
| data | <code>\*</code> | to be returned by [Walker#walk](Walker#walk) method. |
| depth | <code>number</code> | 0 for `rootDir`. |
| entries | <code>Array</code> | available to `onFinal` handler |
| ruler | <code>Ruler</code> | currently active Ruler instance. |
| [args] | <code>Array.&lt;\*&gt;</code> | in error.context only |
| [locus] | <code>string</code> | in error.context or `termination` property. |

<a name="TWalkOptions"></a>

## TWalkOptions : <code>Object</code>
Options for Walker#walk...() instance methods and constructor.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [data] | <code>\*</code> | to be shared between handlers. |
| [onDir] | <code>function</code> | handler |
| [onEntry] | <code>function</code> | handler |
| [onFinal] | <code>function</code> | handler |
| [tick] | <code>function</code> | handler |
| [trace] | <code>function</code> | handler |
| [ruler] | <code>Ruler</code> | Ruler instance. |

<a name="TWalkerOptions"></a>

## TWalkerOptions : <code>Object</code>
Walker constructor options.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [data] | <code>Object</code> | to be shared between handlers. |
| [interval] | <code>number</code> | minimal interval (ms) between ticks (default: 200). |
| [rules] | <code>\*</code> | ruler instance or rule definitions. |

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

## Typedefs

<dl>
<dt><a href="#TEntryType">TEntryType</a> : <code>string</code></dt>
<dd><p>Value of directory entry <code>type</code> property.</p>
</dd>
<dt><a href="#TDirEntry">TDirEntry</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#TWalkContext">TWalkContext</a> : <code>Object</code></dt>
<dd><p>Data context <a href="Walker#walk">Walker#walk</a> provides handler methods / plugins with.</p>
</dd>
<dt><a href="#TWalkOptions">TWalkOptions</a> : <code>Object</code></dt>
<dd><p>Options for Walker#walk...() instance methods and constructor.</p>
</dd>
<dt><a href="#TWalkerOptions">TWalkerOptions</a> : <code>Object</code></dt>
<dd><p>Walker constructor options.</p>
</dd>
</dl>

<a name="TEntryType"></a>

## TEntryType : <code>string</code>
Value of directory entry `type` property.

**Kind**: global typedef  
<a name="TDirEntry"></a>

## TDirEntry : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| name | <code>string</code> | 
| type | [<code>TEntryType</code>](#TEntryType) | 

<a name="TWalkContext"></a>

## TWalkContext : <code>Object</code>
Data context [Walker#walk](Walker#walk) provides handler methods / plugins with.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| absPath | <code>string</code> | separator-terminated absolute path |
| current | <code>Object</code> | entry in [Walker#visited](Walker#visited). |
| data | <code>\*</code> | to be returned by [Walker#walk](Walker#walk) method. |
| depth | <code>number</code> | 0 for `rootDir`. |
| entries | <code>Array</code> | available to `onFinal` handler |
| ruler | <code>Ruler</code> | currently active Ruler instance. |
| [args] | <code>Array.&lt;\*&gt;</code> | in error.context only |
| [locus] | <code>string</code> | in error.context or `termination` property. |

<a name="TWalkOptions"></a>

## TWalkOptions : <code>Object</code>
Options for Walker#walk...() instance methods and constructor.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [data] | <code>\*</code> | to be shared between handlers. |
| [onDir] | <code>function</code> | handler |
| [onEntry] | <code>function</code> | handler |
| [onFinal] | <code>function</code> | handler |
| [tick] | <code>function</code> | handler |
| [trace] | <code>function</code> | handler |
| [ruler] | <code>Ruler</code> | Ruler instance. |

<a name="TWalkerOptions"></a>

## TWalkerOptions : <code>Object</code>
Walker constructor options.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [data] | <code>Object</code> | to be shared between handlers. |
| [interval] | <code>number</code> | minimal interval (ms) between ticks (default: 200). |
| [rules] | <code>\*</code> | ruler instance or rule definitions. |

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

## Typedefs

<dl>
<dt><a href="#TEntryType">TEntryType</a> : <code>string</code></dt>
<dd><p>Value of directory entry <code>type</code> property.</p>
</dd>
<dt><a href="#TDirEntry">TDirEntry</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#TWalkContext">TWalkContext</a> : <code>Object</code></dt>
<dd><p>Data context <a href="Walker#walk">Walker#walk</a> provides handler methods / plugins with.</p>
</dd>
<dt><a href="#TWalkOptions">TWalkOptions</a> : <code>Object</code></dt>
<dd><p>Options for Walker#walk...() instance methods and constructor.</p>
</dd>
<dt><a href="#TWalkerOptions">TWalkerOptions</a> : <code>Object</code></dt>
<dd><p>Walker constructor options.</p>
</dd>
</dl>

<a name="TEntryType"></a>

## TEntryType : <code>string</code>
Value of directory entry `type` property.

**Kind**: global typedef  
<a name="TDirEntry"></a>

## TDirEntry : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| name | <code>string</code> | 
| type | [<code>TEntryType</code>](#TEntryType) | 

<a name="TWalkContext"></a>

## TWalkContext : <code>Object</code>
Data context [Walker#walk](Walker#walk) provides handler methods / plugins with.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| absPath | <code>string</code> | separator-terminated absolute path |
| current | <code>Object</code> | entry in [Walker#visited](Walker#visited). |
| data | <code>\*</code> | to be returned by [Walker#walk](Walker#walk) method. |
| depth | <code>number</code> | 0 for `rootDir`. |
| entries | <code>Array</code> | available to `onFinal` handler |
| ruler | <code>Ruler</code> | currently active Ruler instance. |
| [args] | <code>Array.&lt;\*&gt;</code> | in error.context only |
| [locus] | <code>string</code> | in error.context or `termination` property. |

<a name="TWalkOptions"></a>

## TWalkOptions : <code>Object</code>
Options for Walker#walk...() instance methods and constructor.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [data] | <code>\*</code> | to be shared between handlers. |
| [onDir] | <code>function</code> | handler |
| [onEntry] | <code>function</code> | handler |
| [onFinal] | <code>function</code> | handler |
| [tick] | <code>function</code> | handler |
| [trace] | <code>function</code> | handler |
| [ruler] | <code>Ruler</code> | Ruler instance. |

<a name="TWalkerOptions"></a>

## TWalkerOptions : <code>Object</code>
Walker constructor options.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [data] | <code>Object</code> | to be shared between handlers. |
| [interval] | <code>number</code> | minimal interval (ms) between ticks (default: 200). |
| [rules] | <code>\*</code> | ruler instance or rule definitions. |

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

## Typedefs

<dl>
<dt><a href="#TEntryType">TEntryType</a> : <code>string</code></dt>
<dd><p>Value of directory entry <code>type</code> property.</p>
</dd>
<dt><a href="#TDirEntry">TDirEntry</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#TWalkContext">TWalkContext</a> : <code>Object</code></dt>
<dd><p>Data context <a href="Walker#walk">Walker#walk</a> provides handler methods / plugins with.</p>
</dd>
<dt><a href="#TWalkOptions">TWalkOptions</a> : <code>Object</code></dt>
<dd><p>Options for Walker#walk...() instance methods and constructor.</p>
</dd>
<dt><a href="#TWalkerOptions">TWalkerOptions</a> : <code>Object</code></dt>
<dd><p>Walker constructor options.</p>
</dd>
<dt><a href="#TWalkerStats">TWalkerStats</a> : <code>Object</code></dt>
<dd><p>Walker statistics returned by <code>getStats</code> instance method.</p>
</dd>
</dl>

<a name="TEntryType"></a>

## TEntryType : <code>string</code>
Value of directory entry `type` property.

**Kind**: global typedef  
<a name="TDirEntry"></a>

## TDirEntry : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| name | <code>string</code> | 
| type | [<code>TEntryType</code>](#TEntryType) | 

<a name="TWalkContext"></a>

## TWalkContext : <code>Object</code>
Data context [Walker#walk](Walker#walk) provides handler methods / plugins with.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| absPath | <code>string</code> | separator-terminated absolute path |
| current | <code>Object</code> | entry in [Walker#visited](Walker#visited). |
| data | <code>\*</code> | to be returned by [Walker#walk](Walker#walk) method. |
| depth | <code>number</code> | 0 for `rootDir`. |
| ruler | <code>Ruler</code> | currently active Ruler instance. |
| [args] | <code>Array.&lt;\*&gt;</code> | in error.context only |
| [locus] | <code>string</code> | in error.context or `termination` property. |

<a name="TWalkOptions"></a>

## TWalkOptions : <code>Object</code>
Options for Walker#walk...() instance methods and constructor.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [data] | <code>\*</code> | to be shared between handlers. |
| [onDir] | <code>function</code> | handler |
| [onEntry] | <code>function</code> | handler |
| [onFinal] | <code>function</code> | handler |
| [tick] | <code>function</code> | handler |
| [trace] | <code>function</code> | handler |
| [ruler] | <code>Ruler</code> | Ruler instance. |

<a name="TWalkerOptions"></a>

## TWalkerOptions : <code>Object</code>
Walker constructor options.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [data] | <code>Object</code> | to be shared between handlers. |
| [interval] | <code>number</code> | minimal interval (ms) between ticks (default: 200). |
| [rules] | <code>\*</code> | ruler instance or rule definitions. |
| [symlinks] | <code>boolean</code> | if truey, then follow symlinks. |

<a name="TWalkerStats"></a>

## TWalkerStats : <code>Object</code>
Walker statistics returned by `getStats` instance method.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| dirs | <code>number</code> | directories visited. |
| entries | <code>number</code> | file system entries processed. |
| retries | <code>number</code> | may happen when file descriptors limit was exceeded. |
| revoked | <code>number</code> | number of duplicate attempts to the same directory. |

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

## Functions

<dl>
<dt><a href="#createEntry">createEntry()</a> ⇒ <code><a href="#TDirEntry">TDirEntry</a></code></dt>
<dd></dd>
<dt><a href="#translateEntry">translateEntry(dirEntry)</a> ⇒ <code><a href="#TDirEntry">TDirEntry</a></code></dt>
<dd><p>Translate native</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#TEntryType">TEntryType</a> : <code>string</code></dt>
<dd><p>Value of directory entry <code>type</code> property.</p>
</dd>
<dt><a href="#TDirEntry">TDirEntry</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#TWalkContext">TWalkContext</a> : <code>Object</code></dt>
<dd><p>Data context <a href="Walker#walk">Walker#walk</a> provides handler methods / plugins with.</p>
</dd>
<dt><a href="#TWalkOptions">TWalkOptions</a> : <code>Object</code></dt>
<dd><p>Options for Walker#walk...() instance methods and constructor.</p>
</dd>
<dt><a href="#TWalkerOptions">TWalkerOptions</a> : <code>Object</code></dt>
<dd><p>Walker constructor options.</p>
</dd>
<dt><a href="#TWalkerStats">TWalkerStats</a> : <code>Object</code></dt>
<dd><p>Walker statistics returned by <code>getStats</code> instance method.</p>
</dd>
</dl>

<a name="createEntry"></a>

## createEntry() ⇒ [<code>TDirEntry</code>](#TDirEntry)
**Kind**: global function  
<a name="translateEntry"></a>

## translateEntry(dirEntry) ⇒ [<code>TDirEntry</code>](#TDirEntry)
Translate native

**Kind**: global function  

| Param | Type |
| --- | --- |
| dirEntry | <code>fs.Dirent</code> | 

<a name="TEntryType"></a>

## TEntryType : <code>string</code>
Value of directory entry `type` property.

**Kind**: global typedef  
<a name="TDirEntry"></a>

## TDirEntry : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| action | <code>number</code> | 
| match | <code>Array.&lt;Array.&lt;number&gt;&gt;</code> | 
| name | <code>string</code> | 
| type | [<code>TEntryType</code>](#TEntryType) | 

<a name="TWalkContext"></a>

## TWalkContext : <code>Object</code>
Data context [Walker#walk](Walker#walk) provides handler methods / plugins with.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| absPath | <code>string</code> | separator-terminated absolute path |
| current | <code>Object</code> | entry in [Walker#visited](Walker#visited). |
| data | <code>\*</code> | to be returned by [Walker#walk](Walker#walk) method. |
| depth | <code>number</code> | 0 for `rootDir`. |
| ruler | <code>Ruler</code> | currently active Ruler instance. |
| [args] | <code>Array.&lt;\*&gt;</code> | in error.context only |
| [locus] | <code>string</code> | in error.context or `termination` property. |

<a name="TWalkOptions"></a>

## TWalkOptions : <code>Object</code>
Options for Walker#walk...() instance methods and constructor.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [data] | <code>\*</code> | to be shared between handlers. |
| [onDir] | <code>function</code> | handler |
| [onEntry] | <code>function</code> | handler |
| [onFinal] | <code>function</code> | handler |
| [tick] | <code>function</code> | handler |
| [trace] | <code>function</code> | handler |
| [ruler] | <code>Ruler</code> | Ruler instance. |

<a name="TWalkerOptions"></a>

## TWalkerOptions : <code>Object</code>
Walker constructor options.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [data] | <code>Object</code> | to be shared between handlers. |
| [interval] | <code>number</code> | minimal interval (ms) between ticks (default: 200). |
| [rules] | <code>\*</code> | ruler instance or rule definitions. |
| [symlinks] | <code>boolean</code> | if truey, then follow symlinks. |

<a name="TWalkerStats"></a>

## TWalkerStats : <code>Object</code>
Walker statistics returned by `getStats` instance method.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| dirs | <code>number</code> | directories visited. |
| entries | <code>number</code> | file system entries processed. |
| retries | <code>number</code> | may happen when file descriptors limit was exceeded. |
| revoked | <code>number</code> | number of duplicate attempts to the same directory. |

