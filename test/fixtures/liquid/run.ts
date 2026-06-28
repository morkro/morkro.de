import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import config from '#config'
import { getUserConfig } from '#config.user'
import { compile } from '#parser/compile.ts'
import { loadFile } from '#utils/fs.ts'
import { parseJSON } from '#utils/json.ts'
import { logger } from '#utils/log.ts'

const log = logger('Liquid')

async function cleanup () {
  try {
    await rm(resolve(config.directories.temp), { recursive: true })
  } catch (error) {
    if (error.code !== 'ENOENT') {
      log.warn(`Failed to cleanup temporary directory: ${error}`)
    }
  }

  try {
    await mkdir(resolve(config.directories.temp), { recursive: true })
  } catch (error){
    throw new Error('Failed to cleanup temporary directory', { cause: error })
  }
}

await cleanup()

const file = await loadFile<string>('test/fixtures/liquid', 'dev.html')
const mockContext = parseJSON<Record<string, unknown>>(
  await loadFile<string>('test/fixtures/liquid', 'mock.json'),
  join('test/fixtures/liquid', 'mock.json')) as Record<string, unknown>

const userConfig = await getUserConfig()
const compiled = await compile(
  file,
  'test/fixtures/liquid/dev.html',
  {
    layoutCache: new Map(),
    data: new Map([...Object.entries(mockContext)]),
    baseUrl: 'https://moritz.berlin',
    shortCodes: userConfig.shortCodes ?? {},
    filters: userConfig.filters ?? {},
    outputRoot: config.directories.temp,
    outputPath: 'dev.html'
  })

// write AST
await writeFile(
  join(config.directories.temp, 'ast.json'), 
  JSON.stringify(compiled.fullPageAst, null, 2),
  'utf-8')

// write rendered
await writeFile(
  join(config.directories.temp, 'rendered.html'),
  compiled.rendered,
  'utf-8')
