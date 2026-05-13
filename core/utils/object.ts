export function getFromObject(path: string[], object: Record<string, unknown>): unknown {
  const [first, ...rest] = path

  if (object[first] === undefined) {
		return undefined
	}
  // if value is the last in the path
  if (rest.length === 0) {
    return object[first]
  }
  if (!isRecord(object[first])) {
		return undefined
	}

  return getFromObject(rest, object[first])
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

export function isRecord (value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
  )
}

export function isObject (value: unknown): value is Record<string, unknown> | unknown[] {
	return typeof value === 'object' && value !== null
}