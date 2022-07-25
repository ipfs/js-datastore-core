import * as Errors from './errors.js'
import * as shard from './shard.js'

export { BaseDatastore } from './base.js'
export { MemoryDatastore } from './memory.js'
export { KeyTransformDatastore } from './keytransform.js'
export { ShardingDatastore } from './sharding.js'
export { MountDatastore } from './mount.js'
export { TieredDatastore } from './tiered.js'
export { NamespaceDatastore } from './namespace.js'

export { Errors }
export { shard }

/**
 * @typedef {import("./types").Shard } Shard
 * @typedef {import("./types").KeyTransform } KeyTransform
 */
