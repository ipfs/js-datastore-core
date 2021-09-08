import { BaseDatastore } from './base.js'
import { Key } from 'interface-datastore/key'
import * as Errors from './errors.js'

/**
 * @typedef {import('interface-datastore').Pair} Pair
 * @typedef {import('interface-datastore').Datastore} Datastore
 * @typedef {import('interface-store').Options} Options
 */

/**
 * @class MemoryDatastore
 * @implements {Datastore}
 */
export class MemoryDatastore extends BaseDatastore {
  constructor () {
    super()

    /** @type {Record<string, Uint8Array>} */
    this.data = {}
  }

  open () {
    return Promise.resolve()
  }

  close () {
    return Promise.resolve()
  }

  /**
   * @param {Key} key
   * @param {Uint8Array} val
   */
  async put (key, val) { // eslint-disable-line require-await
    this.data[key.toString()] = val
  }

  /**
   * @param {Key} key
   */
  async get (key) {
    const exists = await this.has(key)
    if (!exists) throw Errors.notFoundError()
    return this.data[key.toString()]
  }

  /**
   * @param {Key} key
   */
  async has (key) { // eslint-disable-line require-await
    return this.data[key.toString()] !== undefined
  }

  /**
   * @param {Key} key
   */
  async delete (key) { // eslint-disable-line require-await
    delete this.data[key.toString()]
  }

  async * _all () {
    yield * Object.entries(this.data)
      .map(([key, value]) => ({ key: new Key(key), value }))
  }

  async * _allKeys () {
    yield * Object.entries(this.data)
      .map(([key]) => new Key(key))
  }
}
