import { BaseDatastore } from './base.js'
import * as Errors from './errors.js'
import { logger } from '@libp2p/logger'
import { pushable } from 'it-pushable'
import drain from 'it-drain'

const log = logger('datastore:core:tiered')

/**
 * @typedef {import('interface-datastore').Datastore} Datastore
 * @typedef {import('interface-datastore').Options} Options
 * @typedef {import('interface-datastore').Batch} Batch
 * @typedef {import('interface-datastore').Query} Query
 * @typedef {import('interface-datastore').KeyQuery} KeyQuery
 * @typedef {import('interface-datastore').Key} Key
 * @typedef {import('interface-datastore').Pair} Pair
 */

/**
 * @template TEntry
 * @typedef {import('interface-store').AwaitIterable<TEntry>} AwaitIterable
 */

/**
 * A datastore that can combine multiple stores. Puts and deletes
 * will write through to all datastores. Has and get will
 * try each store sequentially. Query will always try the
 * last one first.
 *
 */
export class TieredDatastore extends BaseDatastore {
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
   * @param {Options} [options]
   */
  async put (key, value, options) {
    try {
      await Promise.all(this.stores.map(store => store.put(key, value, options)))
    } catch (err) {
      throw Errors.dbWriteFailedError()
    }
  }

  /**
   * @param {Key} key
   * @param {Options} [options]
   */
  async get (key, options) {
    for (const store of this.stores) {
      try {
        const res = await store.get(key, options)
        if (res) return res
      } catch (err) {
        log.error(err)
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

  /**
   * @param {AwaitIterable<Pair>} source
   * @param {Options} [options]
   * @returns {AsyncIterable<Pair>}
   */
  async * putMany (source, options = {}) {
    let error
    const pushables = this.stores.map(store => {
      const source = pushable({
        objectMode: true
      })

      drain(store.putMany(source, options))
        .catch(err => {
          // store threw while putting, make sure we bubble the error up
          error = err
        })

      return source
    })

    try {
      for await (const pair of source) {
        if (error) {
          throw error
        }

        pushables.forEach(p => p.push(pair))

        yield pair
      }
    } finally {
      pushables.forEach(p => p.end())
    }
  }

  /**
   * @param {AwaitIterable<Key>} source
   * @param {Options} [options]
   * @returns {AsyncIterable<Key>}
   */
  async * deleteMany (source, options = {}) {
    let error
    const pushables = this.stores.map(store => {
      const source = pushable({
        objectMode: true
      })

      drain(store.deleteMany(source, options))
        .catch(err => {
          // store threw while deleting, make sure we bubble the error up
          error = err
        })

      return source
    })

    try {
      for await (const key of source) {
        if (error) {
          throw error
        }

        pushables.forEach(p => p.push(key))

        yield key
      }
    } finally {
      pushables.forEach(p => p.end())
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
        batches.forEach(b => b.put(key, value))
      },
      delete: (key) => {
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
   * @param {Options} [options]
   */
  query (q, options) {
    return this.stores[this.stores.length - 1].query(q, options)
  }

  /**
   * @param {KeyQuery} q
   * @param {Options} [options]
   */
  queryKeys (q, options) {
    return this.stores[this.stores.length - 1].queryKeys(q, options)
  }
}
