import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import config from '#core/config.core.ts'
import type { DataFileMap } from '#core/data/types.ts'
import { parseFrontmatter, removeFrontmatter } from '#parser/frontmatter/parser.ts'
import { parseLiquid } from '#parser/liquid/parser.ts'
import { type RenderContext, render } from '#parser/liquid/renderer.ts'
import { layoutResolver, templateResolver } from '#parser/liquid/resolver.ts'
import type { Template } from '#parser/liquid/types.ts'
import { loadFile } from '#utils/fs.ts'
import { parseJSON } from '#utils/json.ts'
import { log, perf } from '#utils/log.ts'
import { ensureOutputPath } from '#utils/path.ts'
import { toUrl } from '#utils/url.ts'

type Compiled = {
  ast: Template
  frontmatter: Record<string, unknown>
  rendered: string
  outputPath: string
}

type CompilerOptions = {
  data: DataFileMap
  baseUrl: string
  shortCodes: Record<string, () => unknown>
  destDir: string
}

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
  const context = Object.assign(Object.create(core), frontmatter, {
    page: {
      inputPath: input,
      outputPath: output,
      url: toUrl(baseUrl, output)
    }
  })
  log(JSON.stringify(context, null, 2), { lvl: 'debug' })
  return context
}

export async function compile (file: string, path: string, options: CompilerOptions): Promise<Compiled> {
  const compileStart = perf('Total compiling')
  let source = file
  
  const fmStart = perf('Parsing Frontmatter')
  const frontmatter = parseFrontmatter<{ pageClass: string; permalink?: string; layout?: string }>(file)
  source = removeFrontmatter(source)
  fmStart.end()
  
  const srcRoot = resolve(config.directories.src)
  const srcRelative = relative(srcRoot, resolve(path))
  const outputPath = ensureOutputPath(srcRelative, options.destDir, frontmatter.permalink)
  const localContext = createPageContext(
    options.data,
    path,
    outputPath,
    options.baseUrl,
    frontmatter)
  localContext.shortCodes = options.shortCodes

  const lpStart = perf('Parsing Liquid')
  const ast = parseLiquid(source, path)
  lpStart.end()
  
  const rlStart = perf('Rendering Liquid')
  source = await render(ast, localContext, templateResolver)
  rlStart.end()
  let layoutName = frontmatter.layout as string | undefined
  while (layoutName) {
    const layout = await layoutResolver(layoutName)
    const layoutContext = Object.create(localContext)
    layoutContext.content = source
    source = await render(layout.template, layoutContext, templateResolver)
    layoutName = layout.frontmatter.layout as string | undefined
  }
  rlStart.end()
  compileStart.end()
  return { ast, frontmatter, rendered: source, outputPath }
}

async function cleanup () {
  try {
    await rm(resolve(config.directories.temp), { recursive: true })
  } catch {}

  try {
    await mkdir(resolve(config.directories.temp), { recursive: true })
  } catch (error){
    throw new Error('Failed to cleanup temporary directory', { cause: error })
  }
}

if (process.argv.includes('--parse=liquid')) {
  await cleanup()
  const file = await loadFile(join('test/fixtures/liquid', 'dev.html'), 'dev.html')
  const mockContext: RenderContext = parseJSON(
    await loadFile(join('test/fixtures/liquid', 'mock.json'), 'mock.json'),
    join('test/fixtures/liquid', 'mock.json'))

  const compiled = await compile(
    file,
    'test/fixtures/liquid/dev.html',
    {
      data: new Map([['mock', mockContext]]),
      baseUrl: 'https://morkro.de',
      shortCodes: {}
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
}
