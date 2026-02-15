export function getFromObject(path: string[], object: Record<string, unknown>): unknown {
  const [first, ...rest] = path

  // if value doesn't exist
  if (object[first] === undefined) {
    return undefined
  }
  // if value is the last in the path
  if (rest.length === 0) {
    return object[first]
  }
  // if value is not an object, return undefined
  if (typeof object[first] !== 'object') {
    return undefined
  }
  
  return getFromObject(rest, object[first] as Record<string, unknown>)
}