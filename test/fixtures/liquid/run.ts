import { mkdir, rm, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import config from "#core/config.core.ts"
import userConfig from "#core/config.user.ts"
import { compile } from "#parser/index.ts"
import type { RenderContext } from "#parser/liquid/renderer.ts"
import { loadFile } from "#utils/fs.ts"
import { parseJSON } from "#utils/json.ts"
import { log } from "#utils/log.ts"

async function cleanup () {
  try {
    await rm(resolve(config.directories.temp), { recursive: true })
  } catch (error) {
    if (error.code !== 'ENOENT') {
      log(`Failed to cleanup temporary directory: ${error}`, { lvl: 'warn' })
    }
  }

  try {
    await mkdir(resolve(config.directories.temp), { recursive: true })
  } catch (error){
    throw new Error('Failed to cleanup temporary directory', { cause: error })
  }
}

await cleanup()

const file = await loadFile('test/fixtures/liquid', 'dev.html')
const mockContext: RenderContext = parseJSON(
  await loadFile('test/fixtures/liquid', 'mock.json'),
  join('test/fixtures/liquid', 'mock.json'))

const compiled = await compile(
  file,
  'test/fixtures/liquid/dev.html',
  {
    data: new Map([...Object.entries(mockContext)]),
    baseUrl: 'https://morkro.de',
    shortCodes: userConfig.shortCodes ?? {},
    filters: userConfig.filters ?? {},
    destDir: config.directories.temp
  })

// write AST
await writeFile(
  join(config.directories.temp, 'ast.json'), 
  JSON.stringify(compiled.ast, null, 2),
  'utf-8')

// write rendered
await writeFile(
  join(config.directories.temp, 'rendered.html'),
  compiled.rendered,
  'utf-8')
