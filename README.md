# js-datastore-core

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Build Status](https://flat.badgen.net/travis/ipfs/js-datastore-core)](https://travis-ci.com/ipfs/js-datastore-core)
[![Codecov](https://codecov.io/gh/ipfs/js-datastore-core/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/js-datastore-core)
[![Dependency Status](https://david-dm.org/ipfs/js-datastore-core.svg?style=flat-square)](https://david-dm.org/ipfs/js-datastore-core)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D8.0.0-orange.svg?style=flat-square)

> Wrapping implementations for [interface-datastore](https://github.com/ipfs/interface-datastore).

## Lead Maintainer

[Alex Potsides](https://github.com/achingbrain)

## Table of Contents

- [js-datastore-core](#js-datastore-core)
  - [Lead Maintainer](#lead-maintainer)
  - [Table of Contents](#table-of-contents)
  - [Implementations](#implementations)
  - [Install](#install)
  - [Usage](#usage)
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

### Wrapping Stores

```js
const MemoryStore = require('interface-datastore').MemoryDatastore
const MountStore = require('datastore-core').MountDatastore
const Key = require('interface-datastore').Key

const store = new MountStore({prefix: new Key('/a'), datastore: new MemoryStore()})
```

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipfs/js-ipfs-unixfs-importer/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)

