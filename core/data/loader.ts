import { access, readFile, readdir } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import config from '#core/config.core.ts'
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
      // Logging JS files specifically since they shouldn't be trusted
      log(`Importing JavaScript file: ${filePath}`, { lvl: 'debug', d: 'data' })
      const javascript = await import(filePath)
      return javascript.default
    }
    if (ext === '.md') {
      const markdown = await readFile(filePath, 'utf-8')
      return markdown
    }
    log(`Unsupported file extension '${ext}' for file '${filePath}'`, { lvl: 'error', d: 'data' })
    return null
  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      log(`File not found: ${filePath}`, { lvl: 'warn', d: 'data' })
      return null
    }
    throw new Error(`Failed to import data file '${filePath}'`, { cause: error })
  }
}

type DirectoryType = typeof config.directories.internal[keyof typeof config.directories.internal]
export async function loadFromDir (dir: DirectoryType): Promise<DataFileMap> {
  const map: DataFileMap = new Map()
  const directory = resolve(config.directories.src, dir)
  
  try {
    await access(directory)
  } catch {
    log(`Data directory '${directory}' not found`, { lvl: 'error', d: 'data' })
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