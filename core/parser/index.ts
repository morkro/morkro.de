import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import config from '#core/config.core.ts'
import type { DataFileMap } from '#core/data/types.ts'
import { extractFrontmatter } from '#parser/frontmatter/index.ts'
import { parseLiquid } from '#parser/liquid/parser.ts'
import { type RenderContext, render } from '#parser/liquid/renderer.ts'
import { layoutResolver, templateResolver } from '#parser/liquid/resolver.ts'
import type { Template } from '#parser/liquid/types.ts'
import { loadFile } from '#utils/fs.ts'
import { parseJSON } from '#utils/json.ts'
import { log, perf } from '#utils/log.ts'
import { resolveOutput } from '#utils/path.ts'
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

async function applyLayouts (
  source: string,
  layoutName: string | undefined,
  context: RenderContext
): Promise<string> {
  let result = source
  let currentLayout = layoutName

  while (currentLayout) {
    const layout = await layoutResolver(currentLayout)
    const layoutContext = Object.create(context)
    layoutContext.content = result
    result = await render(layout.template, layoutContext, templateResolver)
    currentLayout = layout.frontmatter.layout as string | undefined
  }

  return result
}

export async function compile (file: string, path: string, options: CompilerOptions): Promise<Compiled> {
  const compileStart = perf('Total compiling')
  const { frontmatter, body } = extractFrontmatter(file)
  const outputPath = resolveOutput(path, options.destDir, frontmatter.permalink as string)
  
  const localContext = createPageContext(
    options.data,
    path,
    outputPath,
    options.baseUrl,
    frontmatter)
  localContext.shortCodes = options.shortCodes

  const lpStart = perf('Parsing Liquid')
  const ast = parseLiquid(body, path)
  lpStart.end()
  
  const rlStart = perf('Rendering Liquid')
  const rendered = await render(ast, localContext, templateResolver)
  const final = await applyLayouts(rendered, frontmatter.layout as string | undefined, localContext)
  rlStart.end()

  compileStart.end()
  return { ast, frontmatter, rendered: final, outputPath }
}

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
      shortCodes: {},
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
}
