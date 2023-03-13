
export const replaceStartWith = (s: string, r: string) => {
  const matcher = new RegExp('^' + r)
  return s.replace(matcher, '')
}
