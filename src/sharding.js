import { Key } from 'interface-datastore'
import {
  readShardFun,
  SHARDING_FN,
  README_FN,
  readme
} from './shard.js'
import { BaseDatastore } from './base.js'
import { KeyTransformDatastore } from './keytransform.js'
import * as Errors from './errors.js'

const shardKey = new Key(SHARDING_FN)
const shardReadmeKey = new Key(README_FN)
/**
 * @typedef {import('interface-datastore').Datastore} Datastore
 * @typedef {import('interface-datastore').Options} Options
 * @typedef {import('interface-datastore').Batch} Batch
 * @typedef {import('interface-datastore').Query} Query
 * @typedef {import('interface-datastore').QueryFilter} QueryFilter
 * @typedef {import('interface-datastore').QueryOrder} QueryOrder
 * @typedef {import('interface-datastore').KeyQuery} KeyQuery
 * @typedef {import('interface-datastore').KeyQueryFilter} KeyQueryFilter
 * @typedef {import('interface-datastore').KeyQueryOrder} KeyQueryOrder
 * @typedef {import('interface-datastore').Pair} Pair
 * @typedef {import('./types').Shard} Shard
 *
 */
/**
 * @template TValue
 * @typedef {import('interface-store').Await<TValue> } Await
 */

/**
 * @template TEntry
 * @typedef {import('interface-store').AwaitIterable<TEntry>} AwaitIterable
 */

/**
 * Backend independent abstraction of go-ds-flatfs.
 *
 * Wraps another datastore such that all values are stored
 * sharded according to the given sharding function.
 */
export class ShardingDatastore extends BaseDatastore {
  /**
   * @param {Datastore} store
   * @param {Shard} shard
   */
  constructor (store, shard) {
    super()

    this.child = new KeyTransformDatastore(store, {
      convert: this._convertKey.bind(this),
      invert: this._invertKey.bind(this)
    })
    this.shard = shard
  }

  async open () {
    await this.child.open()

    this.shard = await ShardingDatastore.create(this.child, this.shard)
  }

  /**
   * @param {Key} key
   */
  _convertKey (key) {
    const s = key.toString()
    if (s === shardKey.toString() || s === shardReadmeKey.toString()) {
      return key
    }

    const parent = new Key(this.shard.fun(s))
    return parent.child(key)
  }

  /**
   * @param {Key} key
   */
  _invertKey (key) {
    const s = key.toString()
    if (s === shardKey.toString() || s === shardReadmeKey.toString()) {
      return key
    }
    return Key.withNamespaces(key.list().slice(1))
  }

  /**
   * @deprecated
   * @param {Datastore} store
   * @param {Shard} shard
   */
  static async createOrOpen (store, shard) {
    try {
      await ShardingDatastore.create(store, shard)
    } catch (/** @type {any} */ err) {
      if (err && err.message !== 'datastore exists') throw err
    }
    return ShardingDatastore.open(store)
  }

  /**
   * @deprecated
   * @param {Datastore} store
   */
  static async open (store) {
    const shard = await readShardFun('/', store)
    return new ShardingDatastore(store, shard)
  }

  /**
   * @param {Datastore} store
   * @param {Shard} shard
   */
  static async create (store, shard) {
    const hasShard = await store.has(shardKey)
    if (!hasShard && !shard) {
      throw Errors.dbOpenFailedError(Error('Shard is required when datastore doesn\'t have a shard key already.'))
    }
    if (!hasShard) {
      // @ts-ignore i have no idea what putRaw is or saw any implementation
      const put = typeof store.putRaw === 'function' ? store.putRaw.bind(store) : store.put.bind(store)
      await Promise.all([
        put(shardKey, new TextEncoder().encode(shard.toString() + '\n')),
        put(shardReadmeKey, new TextEncoder().encode(readme))
      ])

      return shard
    }

    // test shards
    const diskShard = await readShardFun('/', store)
    const a = (diskShard || '').toString()
    const b = shard.toString()
    if (a !== b) {
      throw new Error(`specified fun ${b} does not match repo shard fun ${a}`)
    }
    return diskShard
  }

  /**
   * @param {Key} key
   * @param {Uint8Array} val
   * @param {Options} [options]
   */
  put (key, val, options) {
    return this.child.put(key, val, options)
  }

  /**
   * @param {Key} key
   * @param {Options} [options]
   */
  get (key, options) {
    return this.child.get(key, options)
  }

  /**
   * @param {Key} key
   * @param {Options} [options]
   */
  has (key, options) {
    return this.child.has(key, options)
  }

  /**
   * @param {Key} key
   * @param {Options} [options]
   */
  delete (key, options) {
    return this.child.delete(key, options)
  }

  /**
   * @param {AwaitIterable<Pair>} source
   * @param {Options} [options]
   * @returns {AsyncIterable<Pair>}
   */
  async * putMany (source, options = {}) {
    yield * this.child.putMany(source, options)
  }

  /**
   * @param {AwaitIterable<Key>} source
   * @param {Options} [options]
   * @returns {AsyncIterable<Uint8Array>}
   */
  async * getMany (source, options = {}) {
    yield * this.child.getMany(source, options)
  }

  /**
   * @param {AwaitIterable<Key>} source
   * @param {Options} [options]
   * @returns {AsyncIterable<Key>}
   */
  async * deleteMany (source, options = {}) {
    yield * this.child.deleteMany(source, options)
  }

  batch () {
    return this.child.batch()
  }

  /**
   * @param {Query} q
   * @param {Options} [options]
   */
  query (q, options) {
    /** @type {Query} */
    const tq = {
      ...q,
      filters: [
        /** @type {QueryFilter} */
        ({ key }) => key.toString() !== shardKey.toString(),
        /** @type {QueryFilter} */
        ({ key }) => key.toString() !== shardReadmeKey.toString()
      ].concat(q.filters || [])
    }

    return this.child.query(tq, options)
  }

  /**
   * @param {KeyQuery} q
   * @param {Options} [options]
   */
  queryKeys (q, options) {
    /** @type {KeyQuery} */
    const tq = {
      ...q,
      filters: [
        /** @type {KeyQueryFilter} */
        key => key.toString() !== shardKey.toString(),
        /** @type {KeyQueryFilter} */
        key => key.toString() !== shardReadmeKey.toString()
      ].concat(q.filters || [])
    }

    return this.child.queryKeys(tq, options)
  }

  close () {
    return this.child.close()
  }
}
