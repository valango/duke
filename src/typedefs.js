/**
 * Value of directory entry `type` property.
 * @typedef {number} TEntryType
 */

/**
 * Directory entry available for `onEntry` and `onFinal` handlers.
 * @typedef {Object} TDirEntry
 *
 * @property {number} action      - from the rule check for this entry.
 * @property {number[][]} match   - used by `Ruler` instance.
 * @property {string} name
 * @property {TEntryType} type
 */

/**
 * Data context {@link Walker#walk} available when walking the current directory.
 * @typedef {Object} TDirContext
 *
 * @property {Array<*>} [args]      in `error.context` only - arguments of the failed call.
 * @property {Object}   [closure]   Walker internal.
 * @property {Object}   current     `this._visited[dirPath]` value unique for this directory.
 * @property {*}        data        to be returned by {@link Walker#walk} method.
 * @property {number}   depth       0 for `rootPath`; increased, but not used by Walker.
 * @property {string}   dirPath     current directory absolute path
 * @property {string}   done        the name of recently completed handler.
 * @property {string}   [locus]     in `error.context` only - the name of the failed function.
 * @property {*}        [onDir]     A handler function - used by Walker.
 * @property {*}        [onEntry]   A handler function - used by Walker.
 * @property {*}        [onFinal]   A handler function - used by Walker.
 * @property {number}   [override]  in `error.context` only - the exception override value.
 * @property {Object}   project     reserved for application.
 * @property {string}   rootPath    where the walk started from.
 * @property {Ruler}    ruler       the Ruler instance for this directory.
 */

/**
 * Options for Walker#walk...() instance methods and constructor.
 * @typedef {Object} TWalkOptions
 *
 * @property {*}                              [data]
 * @property {function(Object):Promise}       [onDir]   handler
 * @property {function(Object,Object):number} [onEntry] handler
 * @property {function(*,*,*):Promise}        [onFinal] handler
 * @property {Ruler}                          [ruler]   Ruler instance.
 */

/**
 * Walker constructor options.
 * @typedef {Object} TWalkerOptions
 *
 * @property {Object}  [data]        shallow copy will be available for handlers.
 * @property {number}  [interval]    minimal interval (ms) between ticks (default: 200).
 * @property {*}       [rules]       ruler instance or rule definitions.
 * @property {boolean} [symlinks]    enables symbolic links.
 */

/**
 * A value of `Walker#stats` instance property.
 * @typedef {Object} TWalkerStats
 *
 * @property {number}  dirs     directories visited.
 * @property {number}  entries  file system entries processed.
 * @property {number}  retries  may happen when file descriptors limit was exceeded.
 * @property {number}  revoked  number of duplicate attempts to the same directory.
 * @property {number}  walks    active walks count.
 */
