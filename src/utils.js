'use strict'

const TextEncoder = require('ipfs-utils/src/text-encoder')
const TextDecoder = require('ipfs-utils/src/text-decoder')

module.exports.utf8Encoder = new TextEncoder('utf8')
module.exports.utf8Decoder = new TextDecoder('utf8')
