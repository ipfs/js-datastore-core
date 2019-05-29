'use strict'

const collect = async (iterable) => {
  const results = []
  for await (const value of iterable) results.push(value)
  return results
}

exports.collect = collect
