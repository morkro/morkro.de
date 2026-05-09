import { resolve, sep } from "node:path"

export function resolveWithin (basePath: string, requestedPath: string) {
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(resolvedBase, requestedPath)
  const normalisedBase = resolvedBase + sep

  if (resolvedPath !== resolvedBase && !resolvedPath.startsWith(normalisedBase)) {
    throw new Error(`Path escapes base directory: ${requestedPath}`)
  }

  return resolvedPath
}