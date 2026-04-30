import { relative } from 'node:path'
import type { FilterFn } from '#config.user'
import type { DataFileMap } from '#core/data/types.ts'
import { extractFrontmatter } from '#parser/frontmatter/index.ts'
import { parseLiquid } from '#parser/liquid/parser.ts'
import { type RenderContext, render } from '#parser/liquid/renderer.ts'
import { layoutResolver, templateResolver } from '#parser/liquid/resolver.ts'
import type { Layout, Template } from '#parser/liquid/types.ts'
import { logger, perf } from '#utils/log.ts'
import { resolveOutput } from '#utils/path.ts'
import { toUrl } from '#utils/url.ts'

const log = logger('Parser')

const layoutCache = new Map<string, Layout>()

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
  filters: Record<string, FilterFn>
  destDir: string
  pageData?: Record<string, unknown>
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
  frontmatter: Record<string, unknown>,
  pageData?: Record<string, unknown>
): PageContext {
  const core = Object.fromEntries(global.entries()) as BuildContext

  // Check if any page variables would be overwritten by frontmatter data
  for (const key of Object.keys(frontmatter)) {
    if (key in core) {
      log.warn(`Frontmatter key "${key}" overwrites core variable "${key}"`)
    }
  }

  const context = { ...core, ...frontmatter, page: {
    inputPath: input,
    outputPath: output,
    url: toUrl(baseUrl, output),
    ...pageData
  }}
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
    const layout = await layoutResolver(currentLayout, layoutCache)
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
    frontmatter,
    options.pageData)
  localContext.__shortCodes__ = options.shortCodes
  localContext.__filters__ = options.filters
  
  const relativePath = relative(options.destDir, outputPath)
  const lpStart = perf(`Parsing Liquid (${relativePath})`)
  const ast = parseLiquid(body, path)
  lpStart.end()
  
  const rlStart = perf('Rendering Liquid')
  const rendered = await render(ast, localContext, templateResolver)
  const final = await applyLayouts(rendered, frontmatter.layout as string | undefined, localContext)
  rlStart.end()

  compileStart.end()
  return { ast, frontmatter, rendered: final, outputPath }
}