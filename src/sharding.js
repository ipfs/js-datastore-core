'use strict'

const { Adapter, Key, Errors } = require('interface-datastore')
const sh = require('./shard')
const KeytransformStore = require('./keytransform')

const shardKey = new Key(sh.SHARDING_FN)
const shardReadmeKey = new Key(sh.README_FN)
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
 * @typedef {import('./types').Await<TValue> } Await
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
    } catch (err) {
      if (err && err.message !== 'datastore exists') throw err
    }
    return ShardingDatastore.open(store)
  }

  /**
   * @deprecated
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
    const hasShard = await store.has(shardKey)
    if (!hasShard && !shard) {
      throw Errors.dbOpenFailedError(Error('Shard is required when datastore doesn\'t have a shard key already.'))
    }
    if (!hasShard) {
      // @ts-ignore i have no idea what putRaw is or saw any implementation
      const put = typeof store.putRaw === 'function' ? store.putRaw.bind(store) : store.put.bind(store)
      await Promise.all([
        put(shardKey, new TextEncoder().encode(shard.toString() + '\n')),
        put(shardReadmeKey, new TextEncoder().encode(sh.readme))
      ])

      return shard
    }

    // test shards
    const diskShard = await sh.readShardFun('/', store)
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

  batch () {
    return this.child.batch()
  }

  /**
   * @param {Query} q
   * @param {Options} [options]
   */
  query (q, options) {
    const tq = {
      offset: q.offset,
      limit: q.limit,
      /** @type {QueryOrder[]} */
      orders: [],
      /** @type {QueryFilter[]} */
      filters: [
        /** @type {QueryFilter} */
        e => e.key.toString() !== shardKey.toString(),
        /** @type {QueryFilter} */
        e => e.key.toString() !== shardReadmeKey.toString()
      ]
    }

    const { prefix } = q
    if (prefix != null) {
      tq.filters.push((e) => {
        return this._invertKey(e.key).toString().startsWith(prefix)
      })
    }

    if (q.filters != null) {
      const filters = q.filters.map(f => {
        /** @type {QueryFilter} */
        const filter = ({ key, value }) => {
          return f({
            key: this._invertKey(key),
            value
          })
        }

        return filter
      })
      tq.filters = tq.filters.concat(filters)
    }

    if (q.orders != null) {
      tq.orders = q.orders.map(o => {
        /** @type {QueryOrder} */
        const order = (a, b) => {
          return o({
            key: this._invertKey(a.key),
            value: a.value
          }, {
            key: this._invertKey(b.key),
            value: b.value
          })
        }

        return order
      })
    }

    return this.child.query(tq, options)
  }

  /**
   * @param {KeyQuery} q
   * @param {Options} [options]
   */
  queryKeys (q, options) {
    const tq = {
      offset: q.offset,
      limit: q.limit,
      /** @type {KeyQueryOrder[]} */
      orders: [],
      /** @type {KeyQueryFilter[]} */
      filters: [
        /** @type {KeyQueryFilter} */
        key => key.toString() !== shardKey.toString(),
        /** @type {KeyQueryFilter} */
        key => key.toString() !== shardReadmeKey.toString()
      ]
    }

    const { prefix } = q
    if (prefix != null) {
      tq.filters.push((key) => {
        return this._invertKey(key).toString().startsWith(prefix)
      })
    }

    if (q.filters != null) {
      const filters = q.filters.map(f => {
        /** @type {KeyQueryFilter} */
        const filter = (key) => {
          return f(this._invertKey(key))
        }

        return filter
      })
      tq.filters = tq.filters.concat(filters)
    }

    if (q.orders != null) {
      tq.orders = q.orders.map(o => {
        /** @type {KeyQueryOrder} */
        const order = (a, b) => o(this._invertKey(a), this._invertKey(b))

        return order
      })
    }

    return this.child.queryKeys(tq, options)
  }

  close () {
    return this.child.close()
  }
}

module.exports = ShardingDatastore
