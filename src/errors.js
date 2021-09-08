import errCode from 'err-code'

/**
 * @param {Error} [err]
 */
export function dbOpenFailedError (err) {
  err = err || new Error('Cannot open database')
  return errCode(err, 'ERR_DB_OPEN_FAILED')
}

/**
 * @param {Error} [err]
 */
export function dbDeleteFailedError (err) {
  err = err || new Error('Delete failed')
  return errCode(err, 'ERR_DB_DELETE_FAILED')
}

/**
 * @param {Error} [err]
 */
export function dbWriteFailedError (err) {
  err = err || new Error('Write failed')
  return errCode(err, 'ERR_DB_WRITE_FAILED')
}

/**
 * @param {Error} [err]
 */
export function notFoundError (err) {
  err = err || new Error('Not Found')
  return errCode(err, 'ERR_NOT_FOUND')
}

/**
 * @param {Error} [err]
 */
export function abortedError (err) {
  err = err || new Error('Aborted')
  return errCode(err, 'ERR_ABORTED')
}
