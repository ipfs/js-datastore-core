/* @flow */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const Memory = require('interface-datastore').MemoryDatastore
const Key = require('interface-datastore').Key
const collect = require('./util').collect

const KeytransformStore = require('../src/').KeytransformDatastore

describe('KeyTransformDatastore', () => {
  it('basic', async () => {
    const mStore = new Memory()
    const transform = {
      convert (key) {
        return new Key('/abc').child(key)
      },
      invert (key) {
        const l = key.list()
        if (l[0] !== 'abc') {
          throw new Error('missing prefix, convert failed?')
        }
        return Key.withNamespaces(l.slice(1))
      }
    }

    const kStore = new KeytransformStore(mStore, transform)

    const keys = [
      'foo',
      'foo/bar',
      'foo/bar/baz',
      'foo/barb',
      'foo/bar/bazb',
      'foo/bar/baz/barb'
    ].map((s) => new Key(s))
    await Promise.all(keys.map((key) => kStore.put(key, Buffer.from(key.toString()))))
    let kResults = Promise.all(keys.map((key) => kStore.get(key)))
    let mResults = Promise.all(keys.map((key) => mStore.get(new Key('abc').child(key))))
    let results = await Promise.all([kResults, mResults])
    expect(results[0]).to.eql(results[1])

    const mRes = await collect(mStore.query({}))
    const kRes = await collect(kStore.query({}))
    expect(kRes).to.have.length(mRes.length)

    mRes.forEach((a, i) => {
      const kA = a.key
      const kB = kRes[i].key
      expect(transform.invert(kA)).to.eql(kB)
      expect(kA).to.eql(transform.convert(kB))
    })
    await kStore.close()
  })
})
