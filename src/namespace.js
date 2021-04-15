'use strict'

const Key = require('interface-datastore').Key
const KeytransformDatastore = require('./keytransform')
/**
 * @typedef {import('interface-datastore').Datastore} Datastore
 * @typedef {import('interface-datastore').Query} Query
 * @typedef {import('interface-datastore').KeyQuery} KeyQuery
 * @typedef {import('interface-datastore').Options} Options
 * @typedef {import('interface-datastore').Batch} Batch
 * @typedef {import('./types').KeyTransform} KeyTransform
 */

/**
 * Wraps a given datastore into a keytransform which
 * makes a given prefix transparent.
 *
 * For example, if the prefix is `new Key(/hello)` a call
 * to `store.put(new Key('/world'), mydata)` would store the data under
 * `/hello/world`.
 *
 */
class NamespaceDatastore extends KeytransformDatastore {
  /**
   * @param {Datastore} child
   * @param {Key} prefix
   */
  constructor (child, prefix) {
    super(child, {
      convert (key) {
        return prefix.child(key)
      },
      invert (key) {
        if (prefix.toString() === '/') {
          return key
        }

        if (!prefix.isAncestorOf(key)) {
          throw new Error(`Expected prefix: (${prefix.toString()}) in key: ${key.toString()}`)
        }

        return new Key(key.toString().slice(prefix.toString().length), false)
      }
    })

    this.prefix = prefix
  }

  /**
   * @param {Query} q
   * @param {Options} [options]
   */
  query (q, options) {
    if (q.prefix && this.prefix.toString() !== '/') {
      return super.query(Object.assign({}, q, {
        prefix: this.prefix.child(new Key(q.prefix)).toString()
      }))
    }
    return super.query(q, options)
  }

  /**
   * @param {KeyQuery} q
   * @param {Options} [options]
   */
  queryKeys (q, options) {
    if (q.prefix && this.prefix.toString() !== '/') {
      return super.queryKeys(Object.assign({}, q, {
        prefix: this.prefix.child(new Key(q.prefix)).toString()
      }))
    }
    return super.queryKeys(q, options)
  }
}

module.exports = NamespaceDatastore
