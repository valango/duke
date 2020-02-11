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

