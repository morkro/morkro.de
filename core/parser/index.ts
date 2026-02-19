import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { DIRECTORIES } from '#config'
import { removeFrontmatter } from '#parser/frontmatter/parser.ts'
import { parseLiquid } from '#parser/liquid/parser.ts'
import { render, type RenderContext } from '#parser/liquid/renderer.ts'
import { templateResolver } from '#parser/liquid/resolver.ts'
import { loadFile } from '#utils/fs.ts'
import { parseJSON } from '#utils/json.ts'

/** TEMP */
async function cleanup () {
  try {
    await rm(resolve(DIRECTORIES.TEMP), { recursive: true })
  } catch {}

  try {
    await mkdir(resolve(DIRECTORIES.TEMP), { recursive: true })
  } catch (error){
    throw new Error('Failed to cleanup temporary directory', { cause: error })
  }
}

if (process.argv.includes('--parse=liquid')) {
  await cleanup()
  const file = await loadFile(`test/fixtures/liquid`, 'dev.html')
  const mockContext: RenderContext = parseJSON(
    await loadFile(
      `test/fixtures/liquid`, 'mock.json'),
      'test/fixtures/liquid/mock.json')

  console.time('Parsing Liquid')
  const liquid = parseLiquid(removeFrontmatter(file), 'test/fixtures/liquid/dev.html')
  console.timeEnd('Parsing Liquid')
  console.time('Rendering Liquid')
  const rendered = await render(liquid, mockContext, templateResolver)
  console.timeEnd('Rendering Liquid')

  // write AST
  await writeFile(join(DIRECTORIES.TEMP, 'ast.json'), JSON.stringify(liquid, null, 2), 'utf-8')
  // write rendered
  await writeFile(join(DIRECTORIES.TEMP, 'rendered.html'), rendered, 'utf-8')
}
