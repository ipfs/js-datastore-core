'use strict'

const { Adapter, Key, utils: { utf8Encoder } } = require('interface-datastore')
const sh = require('./shard')
const KeytransformStore = require('./keytransform')

const shardKey = new Key(sh.SHARDING_FN)
const shardReadmeKey = new Key(sh.README_FN)
/**
 * @typedef {import('interface-datastore/src/types').Datastore}Datastore
 * @typedef {import("interface-datastore/src/types").Options}Options
 * @typedef {import("interface-datastore/src/types").Batch} Batch
 * @typedef {import('interface-datastore/src/key')} Key
 * @typedef {import('interface-datastore/src/adapter').Query} Query
 * @typedef {import('./types').Shard}Shard
 */

/**
 * Backend independent abstraction of go-ds-flatfs.
 *
 * Wraps another datastore such that all values are stored
 * sharded according to the given sharding function.
 */
class ShardingDatastore extends Adapter {
  /**
   * @param {Datastore} store
   * @param {Shard} shard
   */
  constructor (store, shard) {
    super()

    this.child = new KeytransformStore(store, {
      convert: this._convertKey.bind(this),
      invert: this._invertKey.bind(this)
    })
    this.shard = shard
  }

  open () {
    return this.child.open()
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
   * @param {Datastore} store
   * @param {Shard} shard
   */
  static async createOrOpen (store, shard) {
    try {
      await ShardingDatastore.create(store, shard)
    } catch (err) {
      if (err && err.message !== 'datastore exists') throw err
    }
    return ShardingDatastore.open(store)
  }

  /**
   * @param {Datastore} store
   */
  static async open (store) {
    const shard = await sh.readShardFun('/', store)
    return new ShardingDatastore(store, shard)
  }

  /**
   * @param {Datastore} store
   * @param {Shard} shard
   */
  static async create (store, shard) {
    const exists = await store.has(shardKey)
    if (!exists) {
      // @ts-ignore i have no idea what putRaw is or saw any implementation
      const put = typeof store.putRaw === 'function' ? store.putRaw.bind(store) : store.put.bind(store)
      return Promise.all([put(shardKey, utf8Encoder.encode(shard.toString() + '\n')),
        put(shardReadmeKey, utf8Encoder.encode(sh.readme))])
    }

    const diskShard = await sh.readShardFun('/', store)
    const a = (diskShard || '').toString()
    const b = shard.toString()
    if (a !== b) throw new Error(`specified fun ${b} does not match repo shard fun ${a}`)
    throw new Error('datastore exists')
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

  batch () {
    return this.child.batch()
  }

  /**
   * @param {Query} q
   * @param {Options | undefined} [options]
   */
  query (q, options) {
    const tq = {
      keysOnly: q.keysOnly,
      offset: q.offset,
      limit: q.limit,
      filters: [
        e => e.key.toString() !== shardKey.toString(),
        e => e.key.toString() !== shardReadmeKey.toString()
      ]
    }

    if (q.prefix != null) {
      tq.filters.push((e) => {
        return this._invertKey(e.key).toString().startsWith(q.prefix ? q.prefix : '')
      })
    }

    if (q.filters != null) {
      const filters = q.filters.map((f) => (e) => {
        return f(Object.assign({}, e, {
          key: this._invertKey(e.key)
        }))
      })
      tq.filters = tq.filters.concat(filters)
    }

    if (q.orders != null) {
      tq.orders = q.orders.map((o) => async (res) => {
        res.forEach((e) => { e.key = this._invertKey(e.key) })
        const ordered = await o(res)
        ordered.forEach((e) => { e.key = this._convertKey(e.key) })
        return ordered
      })
    }

    return this.child.query(tq, options)
  }

  close () {
    return this.child.close()
  }
}

module.exports = ShardingDatastore
