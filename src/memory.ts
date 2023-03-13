import { BaseDatastore } from './base.js'
import { Key } from 'interface-datastore/key'
import * as Errors from './errors.js'
import type { Pair } from 'interface-datastore'

export class MemoryDatastore extends BaseDatastore {
  private data: Map<string, Uint8Array>

  constructor () {
    super()

    this.data = new Map()
  }

  async put (key: Key, val: Uint8Array): Promise<void> { // eslint-disable-line require-await
    this.data.set(key.toString(), val)
  }

  async get (key: Key): Promise<Uint8Array> {
    const result = this.data.get(key.toString())

    if (result == null) {
      throw Errors.notFoundError()
    }

    return result
  }

  async has (key: Key): Promise<boolean> { // eslint-disable-line require-await
    return this.data.has(key.toString())
  }

  async delete (key: Key): Promise<void> { // eslint-disable-line require-await
    this.data.delete(key.toString())
  }

  async * _all (): AsyncIterable<Pair> {
    for (const [key, value] of this.data.entries()) {
      yield { key: new Key(key), value }
    }
  }

  async * _allKeys (): AsyncIterable<Key> {
    for (const key of this.data.keys()) {
      yield new Key(key)
    }
  }
}
