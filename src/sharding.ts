import { Batch, Key, KeyQuery, KeyQueryFilter, Options, Pair, Query, QueryFilter } from 'interface-datastore'
import {
  readShardFun,
  SHARDING_FN
} from './shard.js'
import { BaseDatastore } from './base.js'
import { KeyTransformDatastore } from './keytransform.js'
import * as Errors from './errors.js'
import type { Shard } from './index.js'
import type { Datastore } from 'interface-datastore'
import type { AwaitIterable } from 'interface-store'

const shardKey = new Key(SHARDING_FN)

/**
 * Backend independent abstraction of go-ds-flatfs.
 *
 * Wraps another datastore such that all values are stored
 * sharded according to the given sharding function.
 */
export class ShardingDatastore extends BaseDatastore {
  private child: KeyTransformDatastore
  private shard: Shard

  constructor (store: Datastore, shard: Shard) {
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

  _convertKey (key: Key): Key {
    const s = key.toString()
    if (s === shardKey.toString()) {
      return key
    }

    const parent = new Key(this.shard.fun(s))
    return parent.child(key)
  }

  _invertKey (key: Key): Key {
    const s = key.toString()
    if (s === shardKey.toString()) {
      return key
    }
    return Key.withNamespaces(key.list().slice(1))
  }

  /**
   * @deprecated
   */
  static async createOrOpen (store: Datastore, shard: Shard): Promise<ShardingDatastore> {
    try {
      await ShardingDatastore.create(store, shard)
    } catch (err: any) {
      if (err && err.message !== 'datastore exists') {
        throw err
      }
    }
    return ShardingDatastore.open(store)
  }

  /**
   * @deprecated
   */
  static async open (store: Datastore): Promise<ShardingDatastore> {
    const shard = await readShardFun('/', store)
    return new ShardingDatastore(store, shard)
  }

  static async create (store: Datastore, shard: Shard): Promise<Shard> {
    const hasShard = await store.has(shardKey)
    if (!hasShard && !shard) {
      throw Errors.dbOpenFailedError(Error('Shard is required when datastore doesn\'t have a shard key already.'))
    }
    if (!hasShard) {
      // @ts-ignore i have no idea what putRaw is or saw any implementation
      const put = typeof store.putRaw === 'function' ? store.putRaw.bind(store) : store.put.bind(store)
      await Promise.all([
        put(shardKey, new TextEncoder().encode(shard.toString() + '\n'))
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

  async put (key: Key, val: Uint8Array, options?: Options): Promise<void> {
    await this.child.put(key, val, options)
  }

  async get (key: Key, options?: Options): Promise<Uint8Array> {
    return await this.child.get(key, options)
  }

  async has (key: Key, options?: Options): Promise<boolean> {
    return await this.child.has(key, options)
  }

  async delete (key: Key, options?: Options): Promise<void> {
    await this.child.delete(key, options)
  }

  async * putMany (source: AwaitIterable<Pair>, options: Options = {}): AsyncIterable<Pair> {
    yield * this.child.putMany(source, options)
  }

  async * getMany (source: AwaitIterable<Key>, options: Options = {}): AsyncIterable<Uint8Array> {
    yield * this.child.getMany(source, options)
  }

  async * deleteMany (source: AwaitIterable<Key>, options: Options = {}): AsyncIterable<Key> {
    yield * this.child.deleteMany(source, options)
  }

  batch (): Batch {
    return this.child.batch()
  }

  query (q: Query, options?: Options): AsyncIterable<Pair> {
    const omitShard: QueryFilter = ({ key }) => key.toString() !== shardKey.toString()

    const tq: Query = {
      ...q,
      filters: [
        omitShard
      ].concat(q.filters ?? [])
    }

    return this.child.query(tq, options)
  }

  queryKeys (q: KeyQuery, options?: Options): AsyncIterable<Key> {
    const omitShard: KeyQueryFilter = (key) => key.toString() !== shardKey.toString()

    const tq: KeyQuery = {
      ...q,
      filters: [
        omitShard
      ].concat(q.filters || [])
    }

    return this.child.queryKeys(tq, options)
  }

  close () {
    return this.child.close()
  }
}
