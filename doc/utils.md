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
| type | <code>TEntryType</code> | 

