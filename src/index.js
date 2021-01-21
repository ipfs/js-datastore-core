'use strict'

const KeytransformDatastore = require('./keytransform')
const ShardingDatastore = require('./sharding')
const MountDatastore = require('./mount')
const TieredDatastore = require('./tiered')
const NamespaceDatastore = require('./namespace')
const shard = require('./shard')

/**
 * @typedef {import("./types").Shard } Shard
 * @typedef {import("./types").KeyTransform } KeyTransform
 */

module.exports = {
  KeytransformDatastore,
  ShardingDatastore,
  MountDatastore,
  TieredDatastore,
  NamespaceDatastore,
  shard
}
