import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { BASE_URL, DIRECTORIES } from '#config'
import { parseFrontmatter, removeFrontmatter } from '#parser/frontmatter/parser.ts'
import { parseLiquid } from '#parser/liquid/parser.ts'
import { render, type RenderContext } from '#parser/liquid/renderer.ts'
import { templateResolver } from '#parser/liquid/resolver.ts'
import type { Template } from '#parser/liquid/types.ts'
import { loadFile } from '#utils/fs.ts'
import { parseJSON } from '#utils/json.ts'
import { type DataFileMap, createPageContext } from '#core/data.ts'
import { ensureOutputPath } from '#utils/path.ts'

type Compiled = {
  ast: Template
  frontmatter: Record<string, unknown>
  rendered: string
  outputPath: string
}

export async function compile (file: string, path: string, globalData: DataFileMap): Promise<Compiled> {
  console.time('Total compiling')
  let source = file
  
  console.time('Parsing Frontmatter')
  const frontmatter = parseFrontmatter<{ pageClass: string; permalink?: string }>(file)
  source = removeFrontmatter(source)
  console.timeEnd('Parsing Frontmatter')
  const srcRoot = resolve(DIRECTORIES.SRC)
  const srcRelative = relative(srcRoot, resolve(path))
  const outputPath = ensureOutputPath(srcRelative, DIRECTORIES.DEST, frontmatter.permalink)
  const localContext = createPageContext(
    globalData,
    path,
    outputPath,
    BASE_URL,
    frontmatter)

  console.time('Parsing Liquid')
  const ast = parseLiquid(source, path)
  console.timeEnd('Parsing Liquid')
  
  console.time('Rendering Liquid')
  source = await render(ast, localContext, templateResolver)
  console.timeEnd('Rendering Liquid')

  console.timeEnd('Total compiling')
  return { ast, frontmatter, rendered: source, outputPath }
}

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

  const compiled = await compile(
    file,
    'test/fixtures/liquid/dev.html',
    new Map([['mock', mockContext]]))

  // write AST
  await writeFile(
    join(DIRECTORIES.TEMP, 'ast.json'), 
    JSON.stringify(compiled.ast, null, 2),
    'utf-8')
  // write rendered
  await writeFile(
    join(DIRECTORIES.TEMP, 'rendered.html'),
    compiled.rendered,
    'utf-8')
}
