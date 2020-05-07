'use strict'

const { Adapter, utils } = require('interface-datastore')
const map = utils.map

/**
 * A datastore shim, that wraps around a given datastore, changing
 * the way keys look to the user, for example namespacing
 * keys, reversing them, etc.
 */
class KeyTransformDatastore extends Adapter {
  constructor (child, transform) {
    super()

    this.child = child
    this.transform = transform
  }

  open () {
    return this.child.open()
  }

  put (key, val, options) {
    return this.child.put(this.transform.convert(key), val, options)
  }

  get (key, options) {
    return this.child.get(this.transform.convert(key), options)
  }

  has (key, options) {
    return this.child.has(this.transform.convert(key), options)
  }

  delete (key, options) {
    return this.child.delete(this.transform.convert(key), options)
  }

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

  query (q, options) {
    return map(this.child.query(q, options), e => {
      e.key = this.transform.invert(e.key)
      return e
    })
  }

  close () {
    return this.child.close()
  }
}

module.exports = KeyTransformDatastore
