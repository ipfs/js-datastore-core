/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const { Key, MemoryDatastore, utils: { utf8Encoder } } = require('interface-datastore')
const { TieredDatastore } = require('../src')

describe('Tiered', () => {
  describe('all stores', () => {
    const ms = []
    let store
    beforeEach(() => {
      ms.push(new MemoryDatastore())
      ms.push(new MemoryDatastore())
      store = new TieredDatastore(ms)
    })

    it('put', async () => {
      const k = new Key('hello')
      const v = utf8Encoder.encode('world')
      await store.put(k, v)
      const res = await Promise.all([ms[0].get(k), ms[1].get(k)])
      res.forEach((val) => {
        expect(val).to.be.eql(v)
      })
    })

    it('get and has, where available', async () => {
      const k = new Key('hello')
      const v = utf8Encoder.encode('world')
      await ms[1].put(k, v)
      const val = await store.get(k)
      expect(val).to.be.eql(v)
      const exists = await store.has(k)
      expect(exists).to.be.eql(true)
    })

    it('has - key not found', async () => {
      expect(await store.has(new Key('hello1'))).to.be.eql(false)
    })

    it('has and delete', async () => {
      const k = new Key('hello')
      const v = utf8Encoder.encode('world')
      await store.put(k, v)
      let res = await Promise.all([ms[0].has(k), ms[1].has(k)])
      expect(res).to.be.eql([true, true])
      await store.delete(k)
      res = await Promise.all([ms[0].has(k), ms[1].has(k)])
      expect(res).to.be.eql([false, false])
    })
  })

  describe('inteface-datastore-single', () => {
    require('interface-datastore/src/tests')({
      setup () {
        return new TieredDatastore([
          new MemoryDatastore(),
          new MemoryDatastore()
        ])
      },
      teardown () { }
    })
  })
})
