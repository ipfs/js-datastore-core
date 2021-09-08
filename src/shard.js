import { Key } from 'interface-datastore/key'
// @ts-expect-error readme is unused
// eslint-disable-next-line no-unused-vars
import readme from './shard-readme.js'

/**
 * @typedef {import('interface-datastore').Datastore} Datastore
 * @typedef {import('./types').Shard} Shard
 */

export const PREFIX = '/repo/flatfs/shard/'
export const SHARDING_FN = 'SHARDING'
export const README_FN = '_README'

/**
 * @implements {Shard}
 */
export class ShardBase {
  /**
   * @param {any} param
   */
  constructor (param) {
    this.param = param
    this.name = 'base'
    this._padding = ''
  }

  /**
   * @param {string} s
   */
  fun (s) {
    return 'implement me'
  }

  toString () {
    return `${PREFIX}v1/${this.name}/${this.param}`
  }
}
/**
 * @implements {Shard}
 */
export class Prefix extends ShardBase {
  /**
   * @param {number} prefixLen
   */
  constructor (prefixLen) {
    super(prefixLen)
    this._padding = ''.padStart(prefixLen, '_')
    this.name = 'prefix'
  }

  /**
   * @param {string} noslash
   */
  fun (noslash) {
    return (noslash + this._padding).slice(0, this.param)
  }
}

export class Suffix extends ShardBase {
  /**
   * @param {number} suffixLen
   */
  constructor (suffixLen) {
    super(suffixLen)
    this._padding = ''.padStart(suffixLen, '_')
    this.name = 'suffix'
  }

  /**
   * @param {string} noslash
   */
  fun (noslash) {
    const s = this._padding + noslash
    return s.slice(s.length - this.param)
  }
}

export class NextToLast extends ShardBase {
  /**
   * @param {number} suffixLen
   */
  constructor (suffixLen) {
    super(suffixLen)
    this._padding = ''.padStart(suffixLen + 1, '_')
    this.name = 'next-to-last'
  }

  /**
   * @param {string} noslash
   */
  fun (noslash) {
    const s = this._padding + noslash
    const offset = s.length - this.param - 1
    return s.slice(offset, offset + this.param)
  }
}

/**
 * Convert a given string to the matching sharding function.
 *
 * @param {string} str
 * @returns {Shard}
 */
export function parseShardFun (str) {
  str = str.trim()

  if (str.length === 0) {
    throw new Error('empty shard string')
  }

  if (!str.startsWith(PREFIX)) {
    throw new Error(`invalid or no path prefix: ${str}`)
  }

  const parts = str.slice(PREFIX.length).split('/')
  const version = parts[0]

  if (version !== 'v1') {
    throw new Error(`expect 'v1' version, got '${version}'`)
  }

  const name = parts[1]

  if (!parts[2]) {
    throw new Error('missing param')
  }

  const param = parseInt(parts[2], 10)

  switch (name) {
    case 'prefix':
      return new Prefix(param)
    case 'suffix':
      return new Suffix(param)
    case 'next-to-last':
      return new NextToLast(param)
    default:
      throw new Error(`unkown sharding function: ${name}`)
  }
}

/**
 * @param {string | Uint8Array} path
 * @param {Datastore} store
 */
export const readShardFun = async (path, store) => {
  const key = new Key(path).child(new Key(SHARDING_FN))
  // @ts-ignore
  const get = typeof store.getRaw === 'function' ? store.getRaw.bind(store) : store.get.bind(store)
  const res = await get(key)
  return parseShardFun(new TextDecoder().decode(res || '').trim())
}

export { default as readme } from './shard-readme.js'
