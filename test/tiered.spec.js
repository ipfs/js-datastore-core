/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const Key = require('interface-datastore').Key
const MemoryStore = require('interface-datastore').MemoryDatastore

const TieredStore = require('../src').TieredDatastore
const { utf8Encoder } = require('../src/utils')

describe('Tiered', () => {
  describe('all stores', () => {
    const ms = []
    let store
    beforeEach(() => {
      ms.push(new MemoryStore())
      ms.push(new MemoryStore())
      store = new TieredStore(ms)
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
        return new TieredStore([
          new MemoryStore(),
          new MemoryStore()
        ])
      },
      teardown () { }
    })
  })
})
