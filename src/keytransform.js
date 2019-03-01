/* @flow */
'use strict'

const utils = require('interface-datastore').utils
const map = utils.map

/* ::
import type {Key, Datastore, Batch, Query, QueryResult, Callback} from 'interface-datastore'
*/

/**
 * An object with a pair of functions for (invertibly) transforming keys
 */
/* ::
type KeyTransform = {
  convert: KeyMapping,
  invert: KeyMapping
}
*/

/**
 * Map one key onto another key.
 */
/* ::
type KeyMapping = (Key) => Key
*/

/**
 * A datastore shim, that wraps around a given datastore, changing
 * the way keys look to the user, for example namespacing
 * keys, reversing them, etc.
 */
class KeyTransformDatastore /* :: <Value> */ {
  /* :: child: Datastore<Value> */
  /* :: transform: KeyTransform */

  constructor (child /* : Datastore<Value> */, transform /* : KeyTransform */) {
    this.child = child
    this.transform = transform
  }

  open () /* : Promise<void> */ {
    return this.child.open()
  }

  async put (key /* : Key */, val /* : Value */) /* : Promise<void> */ {
    return this.child.put(this.transform.convert(key), val)
  }

  async get (key /* : Key */) /* : Promise<Value> */ {
    return this.child.get(this.transform.convert(key))
  }

  async has (key /* : Key */) /* : Promise<bool> */ {
    return this.child.has(this.transform.convert(key))
  }

  async delete (key /* : Key */) /* : Promise<void> */ {
    return this.child.delete(this.transform.convert(key))
  }

  batch () /* : Batch<Value> */ {
    const b = this.child.batch()
    return {
      put: (key /* : Key */, value /* : Value */) /* : void */ => {
        b.put(this.transform.convert(key), value)
      },
      delete: (key /* : Key */) /* : void */ => {
        b.delete(this.transform.convert(key))
      },
      commit: async () /* : Promise<void> */ => {
        return b.commit()
      }
    }
  }

  query (q /* : Query<Value> */) /* : Iterator */ {
    return map(this.child.query(q), e => {
      e.key = this.transform.invert(e.key)
      return e
    })
  }

  async close () /* : Promise<void> */ {
    return this.child.close()
  }
}

module.exports = KeyTransformDatastore
