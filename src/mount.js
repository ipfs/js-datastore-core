/* @flow */
'use strict'

const Key = require('interface-datastore').Key
const Errors = require('interface-datastore').Errors
const utils = require('interface-datastore').utils
const filter = utils.filter
const take = utils.take
const sortAll = utils.sortAll
const replaceStartWith = utils.replaceStartWith

const Keytransform = require('./keytransform')

/* ::
import type {Datastore, Callback, Batch, Query, QueryResult} from 'interface-datastore'

type Mount<Value> = {
  prefix: Key,
  datastore: Datastore<Value>
}
*/

/**
 * A datastore that can combine multiple stores inside various
 * key prefixs.
 */
class MountDatastore /* :: <Value> */ {
  /* :: mounts: Array<Mount<Value>> */

  constructor (mounts /* : Array<Mount<Value>> */) {
    this.mounts = mounts.slice()
  }

  async open () /* : Promise<void> */ {
    return Promise.all(this.mounts.map((m) => m.datastore.open()))
  }

  /**
   * Lookup the matching datastore for the given key.
   *
   * @private
   * @param {Key} key
   * @returns {{Datastore, Key, Key}}
   */
  _lookup (key /* : Key */) /* : ?{datastore: Datastore<Value>, mountpoint: Key, rest: Key} */ {
    for (let mount of this.mounts) {
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

  async put (key /* : Key */, value /* : Value */) /* : Promise<void> */ {
    const match = this._lookup(key)
    if (match == null) {
      throw Errors.dbWriteFailedError(new Error('No datastore mounted for this key'))
    }

    return match.datastore.put(match.rest, value)
  }

  async get (key /* : Key */) /* : Promise<Value> */ {
    const match = this._lookup(key)
    if (match == null) {
      throw Errors.notFoundError(new Error('No datastore mounted for this key'))
    }
    return match.datastore.get(match.rest)
  }

  async has (key /* : Key */) /* : Promise<bool> */ {
    const match = this._lookup(key)
    if (match == null) {
      return false
    }
    return match.datastore.has(match.rest)
  }

  async delete (key /* : Key */) /* : Promise<void> */ {
    const match = this._lookup(key)
    if (match == null) {
      throw Errors.dbDeleteFailedError(new Error('No datastore mounted for this key'))
    }

    return match.datastore.delete(match.rest)
  }

  async close () /* : Promise<void> */ {
    return Promise.all(this.mounts.map((m) => {
      return m.datastore.close()
    }))
  }

  batch () /* : Batch<Value> */ {
    const batchMounts = {}
    const lookup = (key /* : Key */) /* : {batch: Batch<Value>, rest: Key} */ => {
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
      put: (key /* : Key */, value /* : Value */) /* : void */ => {
        const match = lookup(key)
        match.batch.put(match.rest, value)
      },
      delete: (key /* : Key */) /* : void */ => {
        const match = lookup(key)
        match.batch.delete(match.rest)
      },
      commit: async () /* : Promise<void> */ => {
        return Promise.all(Object.keys(batchMounts).map(p => batchMounts[p].commit()))
      }
    }
  }

  query (q /* : Query<Value> */) /* : QueryResult<Value> */ {
    const qs = this.mounts.map(m => {
      const ks = new Keytransform(m.datastore, {
        convert: (key /* : Key */) /* : Key */ => {
          throw new Error('should never be called')
        },
        invert: (key /* : Key */) /* : Key */ => {
          return m.prefix.child(key)
        }
      })

      let prefix
      if (q.prefix != null) {
        prefix = replaceStartWith(q.prefix, m.prefix.toString())
      }

      return ks.query({
        prefix: prefix,
        filters: q.filters,
        keysOnly: q.keysOnly
      })
    })

    let it = _many(qs)
    if (q.filters) q.filters.forEach(f => { it = filter(it, f) })
    if (q.orders) q.orders.forEach(o => { it = sortAll(it, o) })
    if (q.offset != null) {
      let i = 0
      it = filter(it, () => i++ >= q.offset)
    }
    if (q.limit != null) it = take(it, q.limit)

    return it
  }
}

function _many (iterable) {
  return (async function * () {
    let completed = iterable.map(() => false)
    while (!completed.every(Boolean)) {
      for (const [idx, itr] of iterable.entries()) {
        const it = await itr.next()
        if (it.done) {
          completed[idx] = true
          continue
        }
        yield it.value
      }
    }
  })()
}

module.exports = MountDatastore
