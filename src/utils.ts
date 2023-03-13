
export const replaceStartWith = (s: string, r: string): string => {
  const matcher = new RegExp('^' + r)
  return s.replace(matcher, '')
}

export interface Openable {
  open: () => Promise<void>
  close: () => Promise<void>
}

export function isOpenable (thing: any): thing is Openable {
  return typeof thing.open === 'function' && typeof thing.close === 'function'
}
