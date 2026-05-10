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
  if (typeof object[first] !== 'object' || object[first] === null) {
    return undefined
  }
  
  return getFromObject(rest, object[first] as Record<string, unknown>)
}

export function mergeMapValues<K, V> (
  base: Map<K, V>,
  over: Map<K, V>,
  mergeFn: (baseVal: V | undefined, overVal: V | undefined, key: K) => V
): Map<K, V> {
  const map = new Map<K, V>()
  const keys = new Set([...base.keys(), ...over.keys()])

  for (const key of keys) {
    const baseValue = base.get(key)
    const overValue = over.get(key)
    map.set(key, mergeFn(baseValue, overValue, key))
  }

  return map
}