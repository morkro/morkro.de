import { access, readdir, readFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { CUSTOM_DATA_MAPPING, DIRECTORIES } from '#config'
import { parseJSON } from '#utils/json.ts'
import { logSsg as log } from '#utils/log.ts'
import { toUrl } from '#utils/url.ts'

export type DataFileMap = Map<string, Record<string, unknown>>
export type BuildContext = Record<string, unknown>
export type PageContext = BuildContext & {
  page: {
    inputPath: string
    outputPath: string
    url: string
  }
}

export function createPageContext (
  global: DataFileMap,
  input: string,
  output: string,
  baseUrl: string,
  frontmatter: Record<string, unknown>
): PageContext {
  const core = Object.fromEntries(global.entries()) as BuildContext
  return Object.assign(Object.create(core), frontmatter, {
    page: {
      inputPath: input,
      outputPath: output,
      url: toUrl(baseUrl, output)
    }
  })
}

async function loadCoreData (): Promise<DataFileMap> {
  const map: DataFileMap = new Map()
  const directory = resolve(DIRECTORIES.SRC, DIRECTORIES.INTERNAL.DATA)
  
  try {
    await access(directory)
  } catch {
    log(`Data directory "${directory}" not found`, { lvl: 'error' })
    return map
  }

  const files = await readdir(directory)
  for (const file of files) {
    const ext = extname(file)
    const name = basename(file, ext)
    const filePath = resolve(directory, file)
    
    if (ext === '.json') {
      const json = await readFile(filePath, 'utf-8')
      map.set(name, parseJSON(json, filePath))
    } else if (ext === '.js') {
      try {
        const javascript = await import(filePath)
        map.set(name, javascript.default)
      } catch (error) {
        log(`Failed to dynamically import data file "${file}": ${error}`, { lvl: 'error' })
      }
    }
  }

  return map
}

async function loadCustomData(): Promise<DataFileMap> {
  const map: DataFileMap = new Map()

  for (const [key, value] of Object.entries(CUSTOM_DATA_MAPPING)) {
    try {
      const ext = extname(value)
      if (ext === '.json') {
        const json = await readFile(value, 'utf-8')
        map.set(key, parseJSON(json, value))
      } else if (ext === '.js') {
        const javascript = await import(value)
        map.set(key, javascript.default)
      }
    } catch (error) {
      log(`Failed to load custom data file "${value}": ${error}`, { lvl: 'error' })
    }
  }

  return map
}

export async function loadDataFiles(): Promise<DataFileMap> {
  const [coreData, customData] = await Promise.all([
    loadCoreData(),
    loadCustomData()
  ])
  return new Map([...coreData, ...customData])
}