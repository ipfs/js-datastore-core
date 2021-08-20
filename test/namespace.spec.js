/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const { Key, MemoryDatastore } = require('interface-datastore')
const NamespaceStore = require('../src/').NamespaceDatastore
const all = require('it-all')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

describe('KeyTransformDatastore', () => {
  const prefixes = [
    'abc',
    ''
  ]
  prefixes.forEach((prefix) => it(`basic '${prefix}'`, async () => {
    const mStore = new MemoryDatastore()
    const store = new NamespaceStore(mStore, new Key(prefix))

    const keys = [
      'foo',
      'foo/bar',
      'foo/bar/baz',
      'foo/barb',
      'foo/bar/bazb',
      'foo/bar/baz/barb'
    ].map((s) => new Key(s))

    await Promise.all(keys.map(key => store.put(key, uint8ArrayFromString(key.toString()))))
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
      // @ts-ignore
      require('interface-datastore-tests')({
        setup () {
          return new NamespaceStore(new MemoryDatastore(), new Key(prefix))
        },
        async teardown () { }
      })
    })
  })
})
