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

/**
 * A datastore that can combine multiple stores inside various
 * key prefixs.
 */
class MountDatastore {
  constructor (mounts) {
    this.mounts = mounts.slice()
  }

  open () {
    return Promise.all(this.mounts.map((m) => m.datastore.open()))
  }

  /**
   * Lookup the matching datastore for the given key.
   *
   * @private
   * @param {Key} key
   * @returns {{Datastore, Key, Key}}
   */
  _lookup (key) {
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

  put (key, value) {
    const match = this._lookup(key)
    if (match == null) {
      throw Errors.dbWriteFailedError(new Error('No datastore mounted for this key'))
    }

    return match.datastore.put(match.rest, value)
  }

  get (key) {
    const match = this._lookup(key)
    if (match == null) {
      throw Errors.notFoundError(new Error('No datastore mounted for this key'))
    }
    return match.datastore.get(match.rest)
  }

  has (key) {
    const match = this._lookup(key)
    if (match == null) {
      return false
    }
    return match.datastore.has(match.rest)
  }

  delete (key) {
    const match = this._lookup(key)
    if (match == null) {
      throw Errors.dbDeleteFailedError(new Error('No datastore mounted for this key'))
    }

    return match.datastore.delete(match.rest)
  }

  close () {
    return Promise.all(this.mounts.map((m) => {
      return m.datastore.close()
    }))
  }

  batch () {
    const batchMounts = {}
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
      commit: () => {
        return Promise.all(Object.keys(batchMounts).map(p => batchMounts[p].commit()))
      }
    }
  }

  query (q) {
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
