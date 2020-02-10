'use strict'

const
  { T_BLOCK, T_CHAR, T_DIR, T_FIFO, T_FILE, T_SOCKET, T_SYMLINK } =
    require('./constants')

const _ts = {
  [T_BLOCK]: 'blockDevice',
  [T_CHAR]: 'characterDevice',
  [T_DIR]: 'directory',
  [T_FIFO]: 'fifo',
  [T_FILE]: 'file',
  [T_SOCKET]: 'socket',
  [T_SYMLINK]: 'symLink'
}

/**
 * Translate directory entry type code to human-readable type name.
 * @param {TEntryType} type
 * @returns {string | undefined}
 */
const typeName = (type) => _ts[type]

module.exports = typeName
