/* @flow */
'use strict'

const {
  Adapter, Key, Errors, utils: {
    sortAll,
    replaceStartWith
  }
} = require('interface-datastore')
const filter = require('it-filter')
const take = require('it-take')
const merge = require('it-merge')

const Keytransform = require('./keytransform')

/**
 * @typedef {import('interface-datastore').Datastore} Datastore
 * @typedef {import('interface-datastore').Options} Options
 * @typedef {import('interface-datastore').Batch} Batch
 * @typedef {import('interface-datastore').Query} Query
 * @typedef {import('interface-datastore').KeyQuery} KeyQuery
 * @typedef {import('./types').KeyTransform} KeyTransform
 */

/**
 * @template TEntry
 * @typedef {import('./types').AwaitIterable<TEntry>} AwaitIterable
 */

/**
 * A datastore that can combine multiple stores inside various
 * key prefixes
 *
 * @implements {Datastore}
 */
class MountDatastore extends Adapter {
  /**
   * @param {Array<{prefix: Key, datastore: Datastore}>} mounts
   */
  constructor (mounts) {
    super()

    this.mounts = mounts.slice()
  }

  async open () {
    await Promise.all(this.mounts.map((m) => m.datastore.open()))
  }

  /**
   * Lookup the matching datastore for the given key
   *
   * @private
   * @param {Key} key
   * @returns {{datastore: Datastore, mountpoint: Key, rest: Key} | undefined}
   */
  _lookup (key) {
    for (const mount of this.mounts) {
      if (mount.prefix.toString() === key.toString() || mount.prefix.isAncestorOf(key)) {
        const s = replaceStartWith(key.toString(), mount.prefix.toString())
        return {
          datastore: mount.datastore,
          mountpoint: mount.prefix,
          rest: new Key(s)
        }
      }
    }
  }

  /**
   * @param {Key} key
   * @param {Uint8Array} value
   * @param {Options} [options]
   */
  put (key, value, options) {
    const match = this._lookup(key)
    if (match == null) {
      throw Errors.dbWriteFailedError(new Error('No datastore mounted for this key'))
    }

    return match.datastore.put(match.rest, value, options)
  }

  /**
   * @param {Key} key
   * @param {Options} [options]
   */
  get (key, options) {
    const match = this._lookup(key)
    if (match == null) {
      throw Errors.notFoundError(new Error('No datastore mounted for this key'))
    }
    return match.datastore.get(match.rest, options)
  }

  /**
   * @param {Key} key
   * @param {Options} [options]
   */
  has (key, options) {
    const match = this._lookup(key)
    if (match == null) {
      return Promise.resolve(false)
    }
    return match.datastore.has(match.rest, options)
  }

  /**
   * @param {Key} key
   * @param {Options} [options]
   */
  delete (key, options) {
    const match = this._lookup(key)
    if (match == null) {
      throw Errors.dbDeleteFailedError(new Error('No datastore mounted for this key'))
    }

    return match.datastore.delete(match.rest, options)
  }

  async close () {
    await Promise.all(this.mounts.map((m) => {
      return m.datastore.close()
    }))
  }

  /**
   * @returns {Batch}
   */
  batch () {
    /** @type {Record<string, Batch>} */
    const batchMounts = {}
    /**
     * @param {Key} key
     */
    const lookup = (key) => {
      const match = this._lookup(key)
      if (match == null) {
        throw new Error('No datastore mounted for this key')
      }

      const m = match.mountpoint.toString()
      if (batchMounts[m] == null) {
        batchMounts[m] = match.datastore.batch()
      }

      return {
        batch: batchMounts[m],
        rest: match.rest
      }
    }

    return {
      put: (key, value) => {
        const match = lookup(key)
        match.batch.put(match.rest, value)
      },
      delete: (key) => {
        const match = lookup(key)
        match.batch.delete(match.rest)
      },
      commit: async (options) => {
        await Promise.all(Object.keys(batchMounts).map(p => batchMounts[p].commit(options)))
      }
    }
  }

  /**
   * @param {Query} q
   * @param {Options} [options]
   */
  query (q, options) {
    const qs = this.mounts.map(m => {
      const ks = new Keytransform(m.datastore, {
        convert: (key) => {
          throw new Error('should never be called')
        },
        invert: (key) => {
          return m.prefix.child(key)
        }
      })

      let prefix
      if (q.prefix != null) {
        prefix = replaceStartWith(q.prefix, m.prefix.toString())
      }

      return ks.query({
        prefix: prefix,
        filters: q.filters
      }, options)
    })

    let it = merge(...qs)
    if (q.filters) q.filters.forEach(f => { it = filter(it, f) })
    if (q.orders) q.orders.forEach(o => { it = sortAll(it, o) })
    if (q.offset != null) {
      let i = 0
      it = filter(it, () => i++ >= /** @type {number} */ (q.offset))
    }
    if (q.limit != null) it = take(it, q.limit)

    return it
  }

  /**
   * @param {KeyQuery} q
   * @param {Options} [options]
   */
  queryKeys (q, options) {
    const qs = this.mounts.map(m => {
      const ks = new Keytransform(m.datastore, {
        convert: (key) => {
          throw new Error('should never be called')
        },
        invert: (key) => {
          return m.prefix.child(key)
        }
      })

      let prefix
      if (q.prefix != null) {
        prefix = replaceStartWith(q.prefix, m.prefix.toString())
      }

      return ks.queryKeys({
        prefix: prefix,
        filters: q.filters
      }, options)
    })

    let it = merge(...qs)
    if (q.filters) q.filters.forEach(f => { it = filter(it, f) })
    if (q.orders) q.orders.forEach(o => { it = sortAll(it, o) })
    if (q.offset != null) {
      let i = 0
      it = filter(it, () => i++ >= /** @type {number} */ (q.offset))
    }
    if (q.limit != null) it = take(it, q.limit)

    return it
  }
}

module.exports = MountDatastore
