<a name="Ruler"></a>

## Ruler
Rule tree and intermediate state of searches.

**Kind**: global class  

* [Ruler](#Ruler)
    * [new Ruler([options], ...definitions)](#new_Ruler_new)
    * [.add(...args)](#Ruler+add) ⇒ [<code>Ruler</code>](#Ruler)
    * [.check(itemName, [itemType])](#Ruler+check) ⇒ <code>number</code>
    * [.clone([ancestors])](#Ruler+clone) ⇒ [<code>Ruler</code>](#Ruler)
    * [.dump(options)](#Ruler+dump) ⇒ <code>string</code> \| <code>undefined</code>
    * [.hadAction(action)](#Ruler+hadAction) ⇒ <code>boolean</code>
    * [.hasAction(action)](#Ruler+hasAction) ⇒ <code>boolean</code>

<a name="new_Ruler_new"></a>

### new Ruler([options], ...definitions)

| Param | Type |
| --- | --- |
| [options] | <code>Object.&lt;{action:number, extended, optimize}&gt;</code> | 
| ...definitions | <code>\*</code> | 

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

<a name="Ruler+check"></a>

### ruler.check(itemName, [itemType]) ⇒ <code>number</code>
Check the `itemName` against rules.

The results array never contains ROOT node, which will be added on every run.
If a node of special action is matched, then only this node is returned.

**Kind**: instance method of [<code>Ruler</code>](#Ruler)  
**Returns**: <code>number</code> - the most prevailing action among matches.  
**Affects**: this._lastMatch  

| Param | Type |
| --- | --- |
| itemName | <code>string</code> | 
| [itemType] | <code>string</code> | 

<a name="Ruler+clone"></a>

### ruler.clone([ancestors]) ⇒ [<code>Ruler</code>](#Ruler)
Create copy of the instance.

**Kind**: instance method of [<code>Ruler</code>](#Ruler)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [ancestors] | <code>\*</code> | <code>false</code> | array or:   - `true` means use `_lastMatch` instance property w fallback to `_ancestors`   - falsy value means use `_ancestors` property. |

<a name="Ruler+dump"></a>

### ruler.dump(options) ⇒ <code>string</code> \| <code>undefined</code>
A plug-in socket for diagnostic dump method.

**Kind**: instance method of [<code>Ruler</code>](#Ruler)  
**Returns**: <code>string</code> \| <code>undefined</code> - NB: always undefined in production mode!  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Array.&lt;string&gt;</code> \| <code>string</code> \| <code>number</code> | which members to show and how. |

<a name="Ruler+hadAction"></a>

### ruler.hadAction(action) ⇒ <code>boolean</code>
Check if any of ancestors contains given action.

**Kind**: instance method of [<code>Ruler</code>](#Ruler)  

| Param | Type |
| --- | --- |
| action | <code>number</code> | 

<a name="Ruler+hasAction"></a>

### ruler.hasAction(action) ⇒ <code>boolean</code>
Check if results from recent match contain given action.

**Kind**: instance method of [<code>Ruler</code>](#Ruler)  

| Param | Type |
| --- | --- |
| action | <code>number</code> | 

