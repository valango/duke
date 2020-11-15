<a name="constants"></a>

## constants : <code>object</code>
**Kind**: global namespace  

* [constants](#constants) : <code>object</code>
    * [.DO_NOTHING](#constants.DO_NOTHING) : <code>number</code>
    * [.DO_SKIP](#constants.DO_SKIP) : <code>number</code>
    * [.DO_ABORT](#constants.DO_ABORT) : <code>number</code>
    * [.DO_HALT](#constants.DO_HALT) : <code>number</code>
    * [.T_BLOCK](#constants.T_BLOCK) : <code>TEntryType</code>
    * [.T_CHAR](#constants.T_CHAR) : <code>TEntryType</code>
    * [.T_DIR](#constants.T_DIR) : <code>TEntryType</code>
    * [.T_FIFO](#constants.T_FIFO) : <code>TEntryType</code>
    * [.T_FILE](#constants.T_FILE) : <code>TEntryType</code>
    * [.T_SOCKET](#constants.T_SOCKET) : <code>TEntryType</code>
    * [.T_SYMLINK](#constants.T_SYMLINK) : <code>TEntryType</code>

<a name="constants.DO_NOTHING"></a>

### constants.DO\_NOTHING : <code>number</code>
Action code, reserved for internal use: do not use this in rule definition!

**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.DO_SKIP"></a>

### constants.DO\_SKIP : <code>number</code>
Action code: skip this directory entry.

**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.DO_ABORT"></a>

### constants.DO\_ABORT : <code>number</code>
Action code: discard all in the current directory.

**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.DO_HALT"></a>

### constants.DO\_HALT : <code>number</code>
Action code: discard all in the current directory; terminate all walking.

**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.T_BLOCK"></a>

### constants.T\_BLOCK : <code>TEntryType</code>
**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.T_CHAR"></a>

### constants.T\_CHAR : <code>TEntryType</code>
**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.T_DIR"></a>

### constants.T\_DIR : <code>TEntryType</code>
Directory type flag - the only one with special meaning for Ruler.

**Kind**: static constant of [<code>constants</code>](#constants)  
**Default**: <code>d</code>  
<a name="constants.T_FIFO"></a>

### constants.T\_FIFO : <code>TEntryType</code>
**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.T_FILE"></a>

### constants.T\_FILE : <code>TEntryType</code>
**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.T_SOCKET"></a>

### constants.T\_SOCKET : <code>TEntryType</code>
**Kind**: static constant of [<code>constants</code>](#constants)  
<a name="constants.T_SYMLINK"></a>

### constants.T\_SYMLINK : <code>TEntryType</code>
**Kind**: static constant of [<code>constants</code>](#constants)  
