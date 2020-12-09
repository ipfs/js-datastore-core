'use strict'

const { Adapter, Errors } = require('interface-datastore')
const log = require('debug')('datastore:core:tiered')
/**
 * @typedef {import('interface-datastore/src/types').Datastore}Datastore
 * @typedef {import("interface-datastore/src/types").Options}Options
 * @typedef {import("interface-datastore/src/types").Batch} Batch
 * @typedef {import('interface-datastore/src/key')} Key
 * @typedef {import('interface-datastore/src/adapter').Query} Query
 */

/**
 * A datastore that can combine multiple stores. Puts and deletes
 * will write through to all datastores. Has and get will
 * try each store sequentially. Query will always try the
 * last one first.
 *
 */
class TieredDatastore extends Adapter {
  /**
   * @param {Datastore[]} stores
   */
  constructor (stores) {
    super()

    this.stores = stores.slice()
  }

  async open () {
    try {
      await Promise.all(this.stores.map((store) => store.open()))
    } catch (err) {
      throw Errors.dbOpenFailedError()
    }
  }

  /**
   * @param {Key} key
   * @param {Uint8Array} value
   */
  async put (key, value) {
    try {
      await Promise.all(this.stores.map(store => store.put(key, value)))
    } catch (err) {
      throw Errors.dbWriteFailedError()
    }
  }

  /**
   * @param {Key} key
   * @param {Options | undefined} [options]
   */
  async get (key, options) {
    for (const store of this.stores) {
      try {
        const res = await store.get(key, options)
        if (res) return res
      } catch (err) {
        log(err)
      }
    }
    throw Errors.notFoundError()
  }

  /**
   * @param {Key} key
   * @param {Options} [options]
   */
  async has (key, options) {
    for (const s of this.stores) {
      if (await s.has(key, options)) {
        return true
      }
    }

    return false
  }

  /**
   * @param {Key} key
   * @param {Options} [options]
   */
  async delete (key, options) {
    try {
      await Promise.all(this.stores.map(store => store.delete(key, options)))
    } catch (err) {
      throw Errors.dbDeleteFailedError()
    }
  }

  async close () {
    await Promise.all(this.stores.map(store => store.close()))
  }

  /**
   * @returns {Batch}
   */
  batch () {
    const batches = this.stores.map(store => store.batch())

    return {
      put: (key, value) => {
        /**
         * @param {{ put: (arg0: any, arg1: any) => any; }} b
         */
        batches.forEach(b => b.put(key, value))
      },
      delete: (key) => {
        /**
         * @param {{ delete: (arg0: any) => any; }} b
         */
        batches.forEach(b => b.delete(key))
      },
      commit: async (options) => {
        for (const batch of batches) {
          await batch.commit(options)
        }
      }
    }
  }

  /**
   * @param {Query} q
   * @param {Options | undefined} [options]
   */
  query (q, options) {
    return this.stores[this.stores.length - 1].query(q, options)
  }
}

module.exports = TieredDatastore
