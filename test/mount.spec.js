/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

import { expect, assert } from 'aegir/utils/chai.js'
import all from 'it-all'
import { Key } from 'interface-datastore/key'
import { MemoryDatastore } from '../src/memory.js'
import { MountDatastore } from '../src/mount.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { interfaceDatastoreTests } from 'interface-datastore-tests'

describe('MountDatastore', () => {
  it('put - no mount', async () => {
    const m = new MountDatastore([])
    try {
      await m.put(new Key('hello'), uint8ArrayFromString('foo'))
      assert(false, 'Failed to throw error on no mount')
    } catch (err) {
      expect(err).to.be.an('Error')
    }
  })

  it('put - wrong mount', async () => {
    const m = new MountDatastore([{
      datastore: new MemoryDatastore(),
      prefix: new Key('cool')
    }])
    try {
      await m.put(new Key('/fail/hello'), uint8ArrayFromString('foo'))
      assert(false, 'Failed to throw error on wrong mount')
    } catch (err) {
      expect(err).to.be.an('Error')
    }
  })

  it('put', async () => {
    const mds = new MemoryDatastore()
    const m = new MountDatastore([{
      datastore: mds,
      prefix: new Key('cool')
    }])

    const val = uint8ArrayFromString('hello')
    await m.put(new Key('/cool/hello'), val)
    const res = await mds.get(new Key('/hello'))
    expect(res).to.eql(val)
  })

  it('get', async () => {
    const mds = new MemoryDatastore()
    const m = new MountDatastore([{
      datastore: mds,
      prefix: new Key('cool')
    }])

    const val = uint8ArrayFromString('hello')
    await mds.put(new Key('/hello'), val)
    const res = await m.get(new Key('/cool/hello'))
    expect(res).to.eql(val)
  })

  it('has', async () => {
    const mds = new MemoryDatastore()
    const m = new MountDatastore([{
      datastore: mds,
      prefix: new Key('cool')
    }])

    const val = uint8ArrayFromString('hello')
    await mds.put(new Key('/hello'), val)
    const exists = await m.has(new Key('/cool/hello'))
    expect(exists).to.eql(true)
  })

  it('delete', async () => {
    const mds = new MemoryDatastore()
    const m = new MountDatastore([{
      datastore: mds,
      prefix: new Key('cool')
    }])

    const val = uint8ArrayFromString('hello')
    await m.put(new Key('/cool/hello'), val)
    await m.delete(new Key('/cool/hello'))
    let exists = await m.has(new Key('/cool/hello'))
    expect(exists).to.eql(false)
    exists = await mds.has(new Key('/hello'))
    expect(exists).to.eql(false)
  })

  it('query simple', async () => {
    const mds = new MemoryDatastore()
    const m = new MountDatastore([{
      datastore: mds,
      prefix: new Key('cool')
    }])

    const val = uint8ArrayFromString('hello')
    await m.put(new Key('/cool/hello'), val)
    const res = await all(m.query({ prefix: '/cool' }))
    expect(res).to.eql([{ key: new Key('/cool/hello'), value: val }])
  })

  describe('interface-datastore', () => {
    interfaceDatastoreTests({
      setup () {
        return new MountDatastore([{
          prefix: new Key('/a'),
          datastore: new MemoryDatastore()
        }, {
          prefix: new Key('/z'),
          datastore: new MemoryDatastore()
        }, {
          prefix: new Key('/q'),
          datastore: new MemoryDatastore()
        }])
      },
      teardown () { }
    })
  })
})
