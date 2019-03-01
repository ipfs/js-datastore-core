/* @flow */
'use strict'

const Key = require('interface-datastore').Key

const sh = require('./shard')
const KeytransformStore = require('./keytransform')

const shardKey = new Key(sh.SHARDING_FN)
const shardReadmeKey = new Key(sh.README_FN)

/* ::
import type {Datastore, Batch, Query, QueryResult} from 'interface-datastore'

import type {ShardV1} from './shard'
*/

/**
 * Backend independent abstraction of go-ds-flatfs.
 *
 * Wraps another datastore such that all values are stored
 * sharded according to the given sharding function.
 */
class ShardingDatastore {
  /* :: shard: ShardV1 */
  /* :: child: Datastore<Buffer> */

  constructor (store /* : Datastore<Buffer> */, shard /* : ShardV1 */) {
    this.child = new KeytransformStore(store, {
      convert: this._convertKey.bind(this),
      invert: this._invertKey.bind(this)
    })
    this.shard = shard
  }

  async open () /* : Promise<void> */ {
    return this.child.open()
  }

  _convertKey (key/* : Key */)/* : Key */ {
    const s = key.toString()
    if (s === shardKey.toString() || s === shardReadmeKey.toString()) {
      return key
    }

    const parent = new Key(this.shard.fun(s))
    return parent.child(key)
  }

  _invertKey (key/* : Key */)/* : Key */ {
    const s = key.toString()
    if (s === shardKey.toString() || s === shardReadmeKey.toString()) {
      return key
    }
    return Key.withNamespaces(key.list().slice(1))
  }

  static async createOrOpen (store /* : Datastore<Buffer> */, shard /* : ShardV1 */) /* : Promise<ShardingDatastore> */ {
    try {
      await ShardingDatastore.create(store, shard)
    } catch (err) {
      if (err && err.message !== 'datastore exists') throw err
    }
    return ShardingDatastore.open(store)
  }

  static async open (store /* : Datastore<Buffer> */) /* : Promise<ShardingDatastore> */ {
    const shard = await sh.readShardFun('/', store)
    return new ShardingDatastore(store, shard)
  }

  static async create (store /* : Datastore<Buffer> */, shard /* : ShardV1 */) /* : Promise<void> */ {
    const exists = await store.has(shardKey)
    if (!exists) {
      const put = typeof store.putRaw === 'function' ? store.putRaw.bind(store) : store.put.bind(store)
      return Promise.all([put(shardKey, Buffer.from(shard.toString() + '\n')),
        put(shardReadmeKey, Buffer.from(sh.readme))])
    }

    const diskShard = await sh.readShardFun('/', store)
    const a = (diskShard || '').toString()
    const b = shard.toString()
    if (a !== b) throw new Error(`specified fun ${b} does not match repo shard fun ${a}`)
    throw new Error('datastore exists')
  }

  async put (key /* : Key */, val /* : Buffer */) /* : Promise<void> */ {
    return this.child.put(key, val)
  }

  async get (key /* : Key */) /* : Promise<Buffer> */ {
    return this.child.get(key)
  }

  async has (key /* : Key */) /* : Promise<bool> */ {
    return this.child.has(key)
  }

  async delete (key /* : Key */) /* : Promise<void> */ {
    return this.child.delete(key)
  }

  batch () /* : Batch<Buffer> */ {
    return this.child.batch()
  }

  query (q /* : Query<Buffer> */) /* : Iterator */ {
    const tq/* : Query<Buffer> */ = {
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
        return this._invertKey(e.key).toString().startsWith(q.prefix)
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

    return this.child.query(tq)
  }

  async close () /* : Promise<void> */ {
    return this.child.close()
  }
}

module.exports = ShardingDatastore
