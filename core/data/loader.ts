import { access, readdir } from 'node:fs/promises'
import { basename, dirname, extname, resolve } from 'node:path'
import config from '#config'
import type { DataFileMap } from '#data/index.ts'
import { loadFile } from '#utils/fs.ts'
import { parseJSON } from '#utils/json.ts'
import { logger } from '#utils/log.ts'
import { isObject } from '#utils/object.ts'
import { resolveWithin } from '#utils/path.ts'

const log = logger('Data')

async function readOrImport (filePath: string): Promise<unknown> {
  const ext = extname(filePath)
  try {
    if (ext === '.json') {
      const json = await loadFile<string>(dirname(filePath), basename(filePath))
      return parseJSON(json, filePath)
    }
    if (ext === '.js') {
      // Logging JS files specifically since they shouldn't be trusted
      log.debug(`Importing JavaScript file: ${filePath}`)
      const javascript = await import(filePath)
      return javascript.default
    }
    if (ext === '.md') {
      const markdown = await loadFile(dirname(filePath), basename(filePath))
      return markdown
    }
    log.error(`Unsupported file extension '${ext}' for file '${filePath}'`, {
      filePath,
      ext
    })
    return null
  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      log.error(`File not found: ${filePath}`, { filePath, error })
      return null
    }
    throw new Error(`Failed to import data file '${filePath}'`, { cause: error })
  }
}

type LoadFromDirOptions = {
  keepExtension?: boolean
  validate?: (value: unknown) => boolean
}

export async function loadFromDir (
  dir: string,
  options: LoadFromDirOptions = {}
): Promise<DataFileMap> {
  const map: DataFileMap = new Map()
  const directory = resolveWithin(config.directories.input, dir)
  const validate = options.validate ?? isObject
  
  try {
    await access(directory)
  } catch (error) {
    log.error('Data directory not found', { error, directory, args: { dir } })
    return map
  }

  const files = await readdir(directory)

  for (const file of files) {
    const key = options.keepExtension ? file : basename(file, extname(file))
    const data = await readOrImport(resolve(directory, file))
    if (validate(data)) {
      map.set(key, data)
    }
  }

  return map
}

export async function loadFromFile(customMap: Record<string, string>): Promise<DataFileMap> {
  const map: DataFileMap = new Map()

  for (const [key, value] of Object.entries(customMap)) {
    const data = await readOrImport(value)
    if (isObject(data)) {
      map.set(key, data)
    }
  }

  return map
}
