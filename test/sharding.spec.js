/* @flow */
/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const assert = chai.expect

const Key = require('interface-datastore').Key
const MemoryStore = require('interface-datastore').MemoryDatastore

const ShardingStore = require('../src').ShardingDatastore
const sh = require('../src').shard

describe('ShardingStore', () => {
  it('create', async () => {
    const ms = new MemoryStore()
    const shard = new sh.NextToLast(2)
    await ShardingStore.create(ms, shard)
    const res = await Promise.all([ms.get(new Key(sh.SHARDING_FN)), ms.get(new Key(sh.README_FN))])
    expect(res[0].toString()).to.eql(shard.toString() + '\n')
    expect(res[1].toString()).to.eql(sh.readme)
  })

  it('open - empty', async () => {
    const ms = new MemoryStore()
    try {
      await ShardingStore.open(ms)
      assert(false, 'Failed to throw error on ShardStore.open')
    } catch (err) {}
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
    await store.put(new Key('hello'), Buffer.from('test'))
    const res = await ms.get(new Key('ll').child(new Key('hello')))
    expect(res).to.eql(Buffer.from('test'))
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
