import { access, readFile, readdir } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { DIRECTORIES } from '#core/config.core.ts'
import { parseJSON } from '#utils/json.ts'
import { logSsg as log } from '#utils/log.ts'
import type { DataFileMap } from './types.ts'

async function readOrImport (filePath: string): Promise<unknown> {
  const ext = extname(filePath)
  try {
    if (ext === '.json') {
      const json = await readFile(filePath, 'utf-8')
      return parseJSON(json, filePath)
    }
    if (ext === '.js') {
      const javascript = await import(filePath)
      return javascript.default
    }
  } catch (error) {
    log(`Failed to read or import data file '${filePath}': ${error}`, { lvl: 'error' })
    return null
  }
}

export async function loadFromDir (dir: typeof DIRECTORIES.INTERNAL[keyof typeof DIRECTORIES.INTERNAL]): Promise<DataFileMap> {
  const map: DataFileMap = new Map()
  const directory = resolve(DIRECTORIES.SRC, dir)
  
  try {
    await access(directory)
  } catch {
    log(`Data directory '${directory}' not found`, { lvl: 'error' })
    return map
  }

  const files = await readdir(directory)

  for (const file of files) {
    const name = basename(file, extname(file))
    const data = await readOrImport(resolve(directory, file))
    if (data) {
      map.set(name, data as Record<string, unknown>)
    }
  }

  return map
}

export async function loadFromFile(customMap: Record<string, string>): Promise<DataFileMap> {
  const map: DataFileMap = new Map()

  for (const [key, value] of Object.entries(customMap)) {
    const data = await readOrImport(value)
    if (data) {
      map.set(key, data as Record<string, unknown>)
    }
  }

  return map
}