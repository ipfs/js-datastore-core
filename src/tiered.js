/* @flow */
'use strict'

const Errors = require('interface-datastore').Errors

/* ::
import type {Key, Datastore, Callback, Batch, Query, QueryResult} from 'interface-datastore'
*/

/**
 * A datastore that can combine multiple stores. Puts and deletes
 * will write through to all datastores. Has and get will
 * try each store sequentially. Query will always try the
 * last one first.
 *
 */
class TieredDatastore /* :: <Value> */ {
  /* :: stores: Array<Datastore<Value>> */

  constructor (stores /* : Array<Datastore<Value>> */) {
    this.stores = stores.slice()
  }

  async open () /* : void */ {
    try {
      await (this.stores.map((store) => store.open()))
    } catch (err) {
      throw Errors.dbOpenFailedError()
    }
  }

  async put (key /* : Key */, value /* : Value */) /* : void */ {
    try {
      await Promise.all(this.stores.map(store => store.put(key, value)))
    } catch (err) {
      throw Errors.dbWriteFailedError()
    }
  }

  async get (key /* : Key */) /* : Promise<Value> */ {
    for (const store of this.stores) {
      try {
        const res = await store.get(key)
        if (res) return res
      } catch (err) {}
    }
    throw Errors.notFoundError()
  }

  async has (key /* : Key */) /* : Promise<bool> */ {
    for (const store of this.stores) {
      const exists = await store.has(key)
      if (exists) return true
    }
    return false
  }

  async delete (key /* : Key */) /* : Promise<void> */ {
    try {
      await Promise.all(this.stores.map(store => store.delete(key)))
    } catch (err) {
      throw Errors.dbDeleteFailedError()
    }
  }

  async close () /* : Promise<void> */ {
    await Promise.all(this.stores.map(store => store.close()))
  }

  batch () /* : Batch<Value> */ {
    const batches = this.stores.map(store => store.batch())

    return {
      put: (key /* : Key */, value /* : Value */) /* : void */ => {
        batches.forEach(b => b.put(key, value))
      },
      delete: (key /* : Key */) /* : void */ => {
        batches.forEach(b => b.delete(key))
      },
      commit: async () /* : Promise<void> */ => {
        for (const batch of batches) {
          await batch.commit()
        }
      }
    }
  }

  query (q /* : Query<Value> */) /* : Iterator */ {
    return this.stores[this.stores.length - 1].query(q)
  }
}

module.exports = TieredDatastore
