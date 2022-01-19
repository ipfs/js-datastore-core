import { BaseDatastore } from './base.js'
import map from 'it-map'
import { pipe } from 'it-pipe'

/**
 * @typedef {import('interface-datastore').Datastore} Datastore
 * @typedef {import('interface-datastore').Options} Options
 * @typedef {import('interface-datastore').Batch} Batch
 * @typedef {import('interface-datastore').Query} Query
 * @typedef {import('interface-datastore').KeyQuery} KeyQuery
 * @typedef {import('interface-datastore').Key} Key
 * @typedef {import('interface-datastore').Pair} Pair
 * @typedef {import('./types').KeyTransform} KeyTransform
 */

/**
 * @template TEntry
 * @typedef {import('interface-store').AwaitIterable<TEntry>} AwaitIterable
 */

/**
 * A datastore shim, that wraps around a given datastore, changing
 * the way keys look to the user, for example namespacing
 * keys, reversing them, etc.
 *
 * @implements {Datastore}
 */
export class KeyTransformDatastore extends BaseDatastore {
  /**
   * @param {Datastore} child
   * @param {KeyTransform} transform
   */
  constructor (child, transform) {
    super()

    this.child = child
    this.transform = transform
  }

  open () {
    return this.child.open()
  }

  /**
   * @param {Key} key
   * @param {Uint8Array} val
   * @param {Options} [options]
   */
  put (key, val, options) {
    return this.child.put(this.transform.convert(key), val, options)
  }

  /**
   * @param {Key} key
   * @param {Options} [options]
   */
  get (key, options) {
    return this.child.get(this.transform.convert(key), options)
  }

  /**
   * @param {Key} key
   * @param {Options} [options]
   */
  has (key, options) {
    return this.child.has(this.transform.convert(key), options)
  }

  /**
   * @param {Key} key
   * @param {Options} [options]
   */
  delete (key, options) {
    return this.child.delete(this.transform.convert(key), options)
  }

  /**
   * @param {AwaitIterable<Pair>} source
   * @param {Options} [options]
   * @returns {AsyncIterable<Pair>}
   */
  async * putMany (source, options = {}) {
    const transform = this.transform
    const child = this.child

    yield * pipe(
      source,
      async function * (source) {
        yield * map(source, ({ key, value }) => ({
          key: transform.convert(key),
          value
        }))
      },
      async function * (source) {
        yield * child.putMany(source, options)
      },
      async function * (source) {
        yield * map(source, ({ key, value }) => ({
          key: transform.invert(key),
          value
        }))
      }
    )
  }

  /**
   * @param {AwaitIterable<Key>} source
   * @param {Options} [options]
   * @returns {AsyncIterable<Uint8Array>}
   */
  async * getMany (source, options = {}) {
    const transform = this.transform
    const child = this.child

    yield * pipe(
      source,
      async function * (source) {
        yield * map(source, key => transform.convert(key))
      },
      async function * (source) {
        yield * child.getMany(source, options)
      }
    )
  }

  /**
   * @param {AwaitIterable<Key>} source
   * @param {Options} [options]
   * @returns {AsyncIterable<Key>}
   */
  async * deleteMany (source, options = {}) {
    const transform = this.transform
    const child = this.child

    yield * pipe(
      source,
      async function * (source) {
        yield * map(source, key => transform.convert(key))
      },
      async function * (source) {
        yield * child.deleteMany(source, options)
      },
      async function * (source) {
        yield * map(source, key => transform.invert(key))
      }
    )
  }

  /**
   * @returns {Batch}
   */
  batch () {
    const b = this.child.batch()
    return {
      put: (key, value) => {
        b.put(this.transform.convert(key), value)
      },
      delete: (key) => {
        b.delete(this.transform.convert(key))
      },
      commit: (options) => {
        return b.commit(options)
      }
    }
  }

  /**
   * @param {Query} q
   * @param {Options} [options]
   */
  query (q, options) {
    /** @type {Query} */
    const query = {
      ...q
    }

    query.filters = (query.filters || []).map(filter => {
      return ({ key, value }) => filter({ key: this.transform.convert(key), value })
    })

    const { prefix } = q
    if (prefix != null && prefix !== '/') {
      delete query.prefix
      query.filters.push(({ key }) => {
        return this.transform.invert(key).toString().startsWith(prefix)
      })
    }

    if (query.orders) {
      query.orders = query.orders.map(order => {
        return (a, b) => order(
          { key: this.transform.invert(a.key), value: a.value },
          { key: this.transform.invert(b.key), value: b.value }
        )
      })
    }

    return map(this.child.query(query, options), ({ key, value }) => {
      return {
        key: this.transform.invert(key),
        value
      }
    })
  }

  /**
   * @param {KeyQuery} q
   * @param {Options} [options]
   */
  queryKeys (q, options) {
    const query = {
      ...q
    }

    query.filters = (query.filters || []).map(filter => {
      return (key) => filter(this.transform.convert(key))
    })

    const { prefix } = q
    if (prefix != null && prefix !== '/') {
      delete query.prefix
      query.filters.push((key) => {
        return this.transform.invert(key).toString().startsWith(prefix)
      })
    }

    if (query.orders) {
      query.orders = query.orders.map(order => {
        return (a, b) => order(
          this.transform.invert(a),
          this.transform.invert(b)
        )
      })
    }

    return map(this.child.queryKeys(query, options), key => {
      return this.transform.invert(key)
    })
  }

  close () {
    return this.child.close()
  }
}
