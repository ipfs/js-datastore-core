
import all from 'it-all'

/**
 * Collect all values from the iterable and sort them using
 * the passed sorter function
 *
 * @template T
 * @param {AsyncIterable<T> | Iterable<T>} iterable
 * @param {(a: T, b: T) => -1 | 0 | 1} sorter
 * @returns {AsyncIterable<T>}
 */
export const sortAll = (iterable, sorter) => {
  return (async function * () {
    const values = await all(iterable)
    yield * values.sort(sorter)
  })()
}

/**
 * @param {string} s
 * @param {string} r
 */
export const replaceStartWith = (s, r) => {
  const matcher = new RegExp('^' + r)
  return s.replace(matcher, '')
}
