import type { Key } from 'interface-datastore'

export interface Shard {
  name: string
  param: number
  readonly _padding: string
  fun: (s: string) => string
  toString: () => string
}

export interface KeyTransform {
  convert: (key: Key) => Key
  invert: (key: Key) => Key
}

export type AwaitIterable <T> = Iterable<T> | AsyncIterable<T>
export type Await<T> = Promise<T> | T
