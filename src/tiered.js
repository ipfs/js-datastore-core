'use strict'

const Errors = require('interface-datastore').Errors
const log = require('debug')('datastore:core:tiered')

/**
 * A datastore that can combine multiple stores. Puts and deletes
 * will write through to all datastores. Has and get will
 * try each store sequentially. Query will always try the
 * last one first.
 *
 */
class TieredDatastore {
  constructor (stores) {
    this.stores = stores.slice()
  }

  async open () {
    try {
      await (this.stores.map((store) => store.open()))
    } catch (err) {
      throw Errors.dbOpenFailedError()
    }
  }

  async put (key, value) {
    try {
      await Promise.all(this.stores.map(store => store.put(key, value)))
    } catch (err) {
      throw Errors.dbWriteFailedError()
    }
  }

  async get (key) {
    for (const store of this.stores) {
      try {
        const res = await store.get(key)
        if (res) return res
      } catch (err) {
        log(err)
      }
    }
    throw Errors.notFoundError()
  }

  has (key) {
    return new Promise(async (resolve) => {
      await Promise.all(this.stores.map(async (store) => {
        const has = await store.has(key)

        if (has) {
          resolve(true)
        }
      }))

      resolve(false)
    })
  }

  async delete (key) {
    try {
      await Promise.all(this.stores.map(store => store.delete(key)))
    } catch (err) {
      throw Errors.dbDeleteFailedError()
    }
  }

  async close () {
    await Promise.all(this.stores.map(store => store.close()))
  }

  batch () {
    const batches = this.stores.map(store => store.batch())

    return {
      put: (key, value) => {
        batches.forEach(b => b.put(key, value))
      },
      delete: (key) => {
        batches.forEach(b => b.delete(key))
      },
      commit: async () => {
        for (const batch of batches) {
          await batch.commit()
        }
      }
    }
  }

  query (q) {
    return this.stores[this.stores.length - 1].query(q)
  }
}

module.exports = TieredDatastore
