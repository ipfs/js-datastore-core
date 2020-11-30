'use strict'

const Key = require('interface-datastore').Key
const { utf8Decoder } = require('../src/utils')
const readme = require('./shard-readme')

/**
 * @typedef {import('./types').IShard} IShard
 */

const PREFIX = '/repo/flatfs/shard/'
const SHARDING_FN = 'SHARDING'
const README_FN = '_README'

/**
 * @implements {IShard}
 */
class Shard {
  constructor (param) {
    this.param = param
    this.name = 'base'
    this._padding = ''
  }

  fun () {
    throw new Error('implement me')
  }

  toString () {
    return `${PREFIX}v1/${this.name}/${this.param}`
  }
}

class Prefix extends Shard {
  constructor (prefixLen) {
    super(prefixLen)
    this._padding = ''.padStart(prefixLen, '_')
    this.name = 'prefix'
  }

  fun (noslash) {
    return (noslash + this._padding).slice(0, this.param)
  }
}

class Suffix extends Shard {
  constructor (suffixLen) {
    super(suffixLen)
    this._padding = ''.padStart(suffixLen, '_')
    this.name = 'suffix'
  }

  fun (noslash) {
    const s = this._padding + noslash
    return s.slice(s.length - this.param)
  }
}

class NextToLast extends Shard {
  constructor (suffixLen) {
    super(suffixLen)
    this._padding = ''.padStart(suffixLen + 1, '_')
    this.name = 'next-to-last'
  }

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
 * @returns {IShard}
 */
function parseShardFun (str) {
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

const readShardFun = async (path, store) => {
  const key = new Key(path).child(new Key(SHARDING_FN))
  const get = typeof store.getRaw === 'function' ? store.getRaw.bind(store) : store.get.bind(store)
  const res = await get(key)
  return parseShardFun(utf8Decoder.decode(res || '').trim())
}

module.exports = {
  readme,
  parseShardFun,
  readShardFun,
  Prefix,
  Suffix,
  NextToLast,
  README_FN,
  SHARDING_FN,
  PREFIX
}
