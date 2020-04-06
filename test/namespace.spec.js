/* eslint-env mocha */
'use strict'

const { Buffer } = require('buffer')
const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const Key = require('interface-datastore').Key
const MemoryStore = require('interface-datastore').MemoryDatastore

const NamespaceStore = require('../src/').NamespaceDatastore
const all = require('async-iterator-all')

describe('KeyTransformDatastore', () => {
  const prefixes = [
    'abc',
    ''
  ]
  prefixes.forEach((prefix) => it(`basic '${prefix}'`, async () => {
    const mStore = new MemoryStore()
    const store = new NamespaceStore(mStore, new Key(prefix))

    const keys = [
      'foo',
      'foo/bar',
      'foo/bar/baz',
      'foo/barb',
      'foo/bar/bazb',
      'foo/bar/baz/barb'
    ].map((s) => new Key(s))

    await Promise.all(keys.map(key => store.put(key, Buffer.from(key.toString()))))
    const nResults = Promise.all(keys.map((key) => store.get(key)))
    const mResults = Promise.all(keys.map((key) => mStore.get(new Key(prefix).child(key))))
    const results = await Promise.all([nResults, mResults])
    const mRes = await all(mStore.query({}))
    const nRes = await all(store.query({}))

    expect(nRes).to.have.length(mRes.length)

    mRes.forEach((a, i) => {
      const kA = a.key
      const kB = nRes[i].key
      expect(store.transform.invert(kA)).to.eql(kB)
      expect(kA).to.eql(store.transform.convert(kB))
    })
    await store.close()

    expect(results[0]).to.eql(results[1])
  }))

  prefixes.forEach((prefix) => {
    describe(`interface-datastore: '${prefix}'`, () => {
      require('interface-datastore/src/tests')({
        setup () {
          return new NamespaceStore(new MemoryStore(), new Key(prefix))
        },
        async teardown () { }
      })
    })
  })
})
