# datastore-core <!-- omit in toc -->

[![ipfs.io](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io)
[![IRC](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Discord](https://img.shields.io/discord/806902334369824788?style=flat-square)](https://discord.gg/ipfs)
[![codecov](https://img.shields.io/codecov/c/github/ipfs/js-datastore-core.svg?style=flat-square)](https://codecov.io/gh/ipfs/js-datastore-core)
[![CI](https://img.shields.io/github/workflow/status/ipfs/js-datastore-core/test%20&%20maybe%20release/master?style=flat-square)](https://github.com/ipfs/js-datastore-core/actions/workflows/js-test-and-release.yml)

> Wrapper implementation for interface-datastore

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Implementations](#implementations)
- [Usage](#usage)
  - [BaseDatastore](#basedatastore)
  - [Wrapping Stores](#wrapping-stores)
- [Contribute](#contribute)
- [License](#license)
- [Contribute](#contribute-1)

## Install

```console
$ npm i datastore-core
```

## Implementations

- Wrapper Implementations
  - Mount: [`src/mount`](src/mount.js)
  - Keytransform: [`src/keytransform`](src/keytransform.js)
  - Sharding: [`src/sharding`](src/sharding.js)
  - Tiered: [`src/tiered`](src/tirered.js)
  - Namespace: [`src/namespace`](src/namespace.js)

## Usage

### BaseDatastore

An base store is made available to make implementing your own datastore easier:

```javascript
import { BaseDatastore } from 'datastore-core'

class MyDatastore extends BaseDatastore {
  constructor () {
    super()
  }

  async put (key, val) {
    // your implementation here
  }

  async get (key) {
    // your implementation here
  }

  // etc...
}
```

See the [MemoryDatastore](./src/memory.js) for an example of how it is used.

### Wrapping Stores

```js
import { Key } from 'interface-datastore'
import {
  MemoryStore,
  MountStore
} from 'datastore-core'

const store = new MountStore({prefix: new Key('/a'), datastore: new MemoryStore()})
```

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipfs/js-ipfs-unixfs-importer/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipfs/js-ipfs-unixfs-importer/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)
