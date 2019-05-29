/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const assert = chai.assert
const expect = chai.expect
const all = require('async-iterator-all')

const Key = require('interface-datastore').Key
const MemoryStore = require('interface-datastore').MemoryDatastore

const MountStore = require('../src').MountDatastore

describe('MountStore', () => {
  it('put - no mount', async () => {
    const m = new MountStore([])
    try {
      await m.put(new Key('hello'), Buffer.from('foo'))
      assert(false, 'Failed to throw error on no mount')
    } catch (err) {
      expect(err).to.be.an('Error')
    }
  })

  it('put - wrong mount', async () => {
    const m = new MountStore([{
      datastore: new MemoryStore(),
      prefix: new Key('cool')
    }])
    try {
      await m.put(new Key('/fail/hello'), Buffer.from('foo'))
      assert(false, 'Failed to throw error on wrong mount')
    } catch (err) {
      expect(err).to.be.an('Error')
    }
  })

  it('put', async () => {
    const mds = new MemoryStore()
    const m = new MountStore([{
      datastore: mds,
      prefix: new Key('cool')
    }])

    const val = Buffer.from('hello')
    await m.put(new Key('/cool/hello'), val)
    const res = await mds.get(new Key('/hello'))
    expect(res).to.eql(val)
  })

  it('get', async () => {
    const mds = new MemoryStore()
    const m = new MountStore([{
      datastore: mds,
      prefix: new Key('cool')
    }])

    const val = Buffer.from('hello')
    await mds.put(new Key('/hello'), val)
    const res = await m.get(new Key('/cool/hello'))
    expect(res).to.eql(val)
  })

  it('has', async () => {
    const mds = new MemoryStore()
    const m = new MountStore([{
      datastore: mds,
      prefix: new Key('cool')
    }])

    const val = Buffer.from('hello')
    await mds.put(new Key('/hello'), val)
    const exists = await m.has(new Key('/cool/hello'))
    expect(exists).to.eql(true)
  })

  it('delete', async () => {
    const mds = new MemoryStore()
    const m = new MountStore([{
      datastore: mds,
      prefix: new Key('cool')
    }])

    const val = Buffer.from('hello')
    await m.put(new Key('/cool/hello'), val)
    await m.delete(new Key('/cool/hello'))
    let exists = await m.has(new Key('/cool/hello'))
    expect(exists).to.eql(false)
    exists = await mds.has(new Key('/hello'))
    expect(exists).to.eql(false)
  })

  it('query simple', async () => {
    const mds = new MemoryStore()
    const m = new MountStore([{
      datastore: mds,
      prefix: new Key('cool')
    }])

    const val = Buffer.from('hello')
    await m.put(new Key('/cool/hello'), val)
    const res = await all(m.query({ prefix: '/cool' }))
    expect(res).to.eql([{ key: new Key('/cool/hello'), value: val }])
  })

  describe('interface-datastore', () => {
    require('interface-datastore/src/tests')({
      setup () {
        return new MountStore([{
          prefix: new Key('/a'),
          datastore: new MemoryStore()
        }, {
          prefix: new Key('/z'),
          datastore: new MemoryStore()
        }, {
          prefix: new Key('/q'),
          datastore: new MemoryStore()
        }])
      },
      teardown () { }
    })
  })
})
