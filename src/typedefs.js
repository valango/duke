/**
 * Value of directory entry `type` property.
 * @typedef {number} TEntryType
 */

/**
 * Directory entry available for `onEntry` and `onFinal` handlers.
 * @typedef {Object} TDirEntry
 * @property {number} action      - from the rule check for this entry.
 * @property {number[][]} match   - used by `Ruler` instance.
 * @property {string} name
 * @property {TEntryType} type
 */

/**
 * Data context {@link Walker#walk} provides handler methods / plugins with.
 * @typedef {Object} TWalkContext
 * @property {string}   absPath     separator-terminated absolute path
 * @property {Object}   [closure]   used internally.
 * @property {Object}   current     entry in {@link Walker#visited}.
 * @property {*}        data        to be returned by {@link Walker#walk} method.
 * @property {number}   depth       0 for `rootDir`.
 * @property {string}   done        the last successfully completed op.
 * @property {Ruler}    ruler       currently active Ruler instance.
 * @property {function(...)} trace
 * @property {number}   upperAction from onEntry handler on upper level.
 * @property {number}   [override]  in error.context only
 * @property {Array<*>} [args]      in error.context only
 * @property {string}   [locus]     in error.context or in `termination` property.
 */

/**
 * Options for Walker#walk...() instance methods and constructor.
 * @typedef {Object} TWalkOptions
 * @property {*}                          [data]    to be shared between handlers.
 * @property {function(Object):Promise}           [onDir]   handler
 * @property {function(Object,Object):number}    [onEntry] handler
 * @property {function(Error,Object)}     [onError] handler
 * @property {function(*,*,*):Promise}     [onFinal] handler
 * @property {function(...)}              [trace]   handler
 * @property {Ruler}                      [ruler]   Ruler instance.
 */

/**
 * Walker constructor options.
 * @typedef {Object} TWalkerOptions
 * @property {Object}  [data]        shallow copy will be available for handlers.
 * @property {number}  [interval]    minimal interval (ms) between ticks (default: 200).
 * @property {*}       [rules]       ruler instance or rule definitions.
 * @property {boolean} [symlinks]    enables symbolic links.
 */

/**
 * A value of `Walker#stats` instance property.
 * @typedef {Object} TWalkerStats
 * @property {number}  dirs     directories visited.
 * @property {number}  entries  file system entries processed.
 * @property {number}  retries  may happen when file descriptors limit was exceeded.
 * @property {number}  revoked  number of duplicate attempts to the same directory.
 * @property {number}  walks    active walks count.
 */
