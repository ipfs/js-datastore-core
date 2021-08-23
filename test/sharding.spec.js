/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const { Key, MemoryDatastore } = require('interface-datastore')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

const ShardingStore = require('../src').ShardingDatastore
const sh = require('../src').shard

describe('ShardingStore', () => {
  it('create', async () => {
    const ms = new MemoryDatastore()
    const shard = new sh.NextToLast(2)
    const store = new ShardingStore(ms, shard)
    await store.open()
    const res = await Promise.all([
      ms.get(new Key(sh.SHARDING_FN)),
      ms.get(new Key(sh.README_FN))
    ])
    expect(uint8ArrayToString(res[0])).to.eql(shard.toString() + '\n')
    expect(uint8ArrayToString(res[1])).to.eql(sh.readme)
  })

  it('open - empty', () => {
    const ms = new MemoryDatastore()
    // @ts-expect-error
    const store = new ShardingStore(ms)
    return expect(store.open())
      .to.eventually.be.rejected()
      .with.property('code', 'ERR_DB_OPEN_FAILED')
  })

  it('open - existing', () => {
    const ms = new MemoryDatastore()
    const shard = new sh.NextToLast(2)
    const store = new ShardingStore(ms, shard)

    return expect(store.open()).to.eventually.be.fulfilled()
  })

  it('basics', async () => {
    const ms = new MemoryDatastore()
    const shard = new sh.NextToLast(2)
    const store = new ShardingStore(ms, shard)
    await store.open()
    await store.put(new Key('hello'), uint8ArrayFromString('test'))
    const res = await ms.get(new Key('ll').child(new Key('hello')))
    expect(res).to.eql(uint8ArrayFromString('test'))
  })

  describe('interface-datastore', () => {
    // @ts-ignore
    require('interface-datastore-tests')({
      setup () {
        const shard = new sh.NextToLast(2)
        return new ShardingStore(new MemoryDatastore(), shard)
      },
      teardown () { }
    })
  })
})
