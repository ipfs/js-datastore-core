import { Key } from 'interface-datastore'
import { KeyTransformDatastore } from './keytransform.js'
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
 */
export class NamespaceDatastore extends KeyTransformDatastore {
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
  }
}
