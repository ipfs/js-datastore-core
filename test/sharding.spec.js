/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const assert = chai.expect

const Key = require('interface-datastore').Key
const MemoryStore = require('interface-datastore').MemoryDatastore

const ShardingStore = require('../src').ShardingDatastore
const sh = require('../src').shard
const { utf8Encoder, utf8Decoder } = require('../src/utils')

describe('ShardingStore', () => {
  it('create', async () => {
    const ms = new MemoryStore()
    const shard = new sh.NextToLast(2)
    await ShardingStore.create(ms, shard)
    const res = await Promise.all([ms.get(new Key(sh.SHARDING_FN)), ms.get(new Key(sh.README_FN))])
    expect(utf8Decoder.decode(res[0])).to.eql(shard.toString() + '\n')
    expect(utf8Decoder.decode(res[1])).to.eql(sh.readme)
  })

  it('open - empty', async () => {
    const ms = new MemoryStore()
    try {
      await ShardingStore.open(ms)
      assert(false, 'Failed to throw error on ShardStore.open')
    } catch (err) {
      expect(err.code).to.equal('ERR_NOT_FOUND')
    }
  })

  it('open - existing', async () => {
    const ms = new MemoryStore()
    const shard = new sh.NextToLast(2)

    await ShardingStore.create(ms, shard)
    await ShardingStore.open(ms)
  })

  it('basics', async () => {
    const ms = new MemoryStore()
    const shard = new sh.NextToLast(2)
    const store = await ShardingStore.createOrOpen(ms, shard)
    expect(store).to.exist()
    await ShardingStore.createOrOpen(ms, shard)
    await store.put(new Key('hello'), utf8Encoder.encode('test'))
    const res = await ms.get(new Key('ll').child(new Key('hello')))
    expect(res).to.eql(utf8Encoder.encode('test'))
  })

  describe('interface-datastore', () => {
    require('interface-datastore/src/tests')({
      setup () {
        const shard = new sh.NextToLast(2)
        return ShardingStore.createOrOpen(new MemoryStore(), shard)
      },
      teardown () { }
    })
  })
})
