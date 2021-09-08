# js-datastore-core <!-- omit in toc -->

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![codecov](https://img.shields.io/codecov/c/github/ipfs/js-datastore-core.svg?style=flat-square)](https://codecov.io/gh/ipfs/js-datastore-core)
[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/ipfs/js-datastore-core/ci?label=ci&style=flat-square)](https://github.com/ipfs/js-datastore-core/actions?query=branch%3Amaster+workflow%3Aci+)

> Implementations for [interface-datastore](https://github.com/ipfs/js-ipfs-interfaces/packages/interface-datastore).

## Lead Maintainer <!-- omit in toc -->

[Alex Potsides](https://github.com/achingbrain)

## Table of Contents <!-- omit in toc -->

- [Implementations](#implementations)
- [Install](#install)
- [Usage](#usage)
  - [BaseDatastore](#basedatastore)
  - [Wrapping Stores](#wrapping-stores)
- [Contribute](#contribute)
- [License](#license)

## Implementations

- Wrapper Implementations
  - Mount: [`src/mount`](src/mount.js)
  - Keytransform: [`src/keytransform`](src/keytransform.js)
  - Sharding: [`src/sharding`](src/sharding.js)
  - Tiered: [`src/tiered`](src/tirered.js)
  - Namespace: [`src/tiered`](src/namespace.js)

## Install

```
$ npm install datastore-core
```

## Usage


### BaseDatastore

An base store is made available to make implementing your own datastore easier:

```javascript
const { BaseDatastore } from 'datastore-core')

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

[MIT](LICENSE)

