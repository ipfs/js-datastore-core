import Key from 'interface-datastore/src/key'

export interface Shard {
    name: string
    param:number
    _padding: string
    fun(s: string): string
    toString(): string
}

export interface KeyTransform {
    convert: (key: Key) => Key
    invert: (key: Key) => Key
}
