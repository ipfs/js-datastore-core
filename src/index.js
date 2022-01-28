import * as ErrorsImport from './errors.js'
import * as ShardImport from './shard.js'

export { BaseDatastore } from './base.js'
export { MemoryDatastore } from './memory.js'
export { KeyTransformDatastore } from './keytransform.js'
export { ShardingDatastore } from './sharding.js'
export { MountDatastore } from './mount.js'
export { TieredDatastore } from './tiered.js'
export { NamespaceDatastore } from './namespace.js'

export const Errors = ErrorsImport
export const shard = ShardImport

/**
 * @typedef {import("./types").Shard } Shard
 * @typedef {import("./types").KeyTransform } KeyTransform
 */
