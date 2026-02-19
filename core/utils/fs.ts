import { resolve, sep } from 'node:path'
import { readFile } from 'node:fs/promises'

export async function loadFile(path: string, fileName: string): Promise<string> {
  const resolvedBase = resolve(path)
  const normalisedBase = resolvedBase + sep
  const resolvedPath = resolve(resolvedBase, fileName)

  if (!resolvedPath.startsWith(normalisedBase)) {
    throw new Error(`Requested file (${resolvedPath}) is not within src/ directory`)
  }

  try {
    return readFile(resolvedPath, 'utf-8')
  } catch (error) {
    throw new Error(`Failed to load file at ${resolvedPath}`, { cause: error })
  }
}

export function ensureExtension(fileName: string, extension: string): string {
  if (!fileName.endsWith(extension)) {
    return fileName + extension
  }
  return fileName
}