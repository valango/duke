/**
 * @typedef {string} TEntryType
 * Value of directory entry `type` property.
 */

/**
 * @typedef {Object} TDirEntry
 * @property {string} name
 * @property {TEntryType} type
 */

/**
 * Data context {@link Walker#walk} provides handler methods / plugins with.
 * @typedef {Object} TWalkContext
 * @property {string}   absPath   separator-terminated absolute path
 * @property {Object}   current   entry in {@link Walker#visited}.
 * @property {*}        data      to be returned by {@link Walker#walk} method.
 * @property {number}   depth     0 for `rootDir`.
 * @property {Ruler}    ruler     currently active Ruler instance.
 * @property {Array<*>} [args]    in error.context only
 * @property {string}   [locus]   in error.context or `termination` property.
 */

/**
 * Options for Walker#walk...() instance methods and constructor.
 * @typedef {Object} TWalkOptions
 * @property {*}                          [data]    to be shared between handlers.
 * @property {function(Object)}           [onDir]   handler
 * @property {function(Object,Object)}    [onEntry] handler
 * @property {function(Object,Object[])}  [onFinal] handler
 * @property {function(...)}              [tick]    handler
 * @property {function(...)}              [trace]   handler
 * @property {Ruler}                      [ruler]   Ruler instance.
 */

/**
 * Walker constructor options.
 * @typedef {Object} TWalkerOptions
 * @property {Object}  [data]        to be shared between handlers.
 * @property {number}  [interval]    minimal interval (ms) between ticks (default: 200).
 * @property {*}       [rules]       ruler instance or rule definitions.
 * @property {boolean} [symlinks]   if truey, then follow symlinks.
 */

/**
 * Walker statistics returned by `getStats` instance method.
 * @typedef {Object} TWalkerStats
 * @property {number}  dirs     directories visited.
 * @property {number}  entries  file system entries processed.
 * @property {number}  retries  may happen when file descriptors limit was exceeded.
 * @property {number}  revoked  number of duplicate attempts to the same directory.
 */
