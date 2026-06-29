import { extname, relative } from 'node:path'
import type { RenderServices } from '#config'
import config from '#config'
import type { DataFileMap } from '#data/index.ts'
import { extractFrontmatter } from '#parser/frontmatter/index.ts'
import { parseLiquid } from '#parser/liquid/parser/index.ts'
import { type RenderContext, render } from '#parser/liquid/renderer.ts'
import { layoutResolver, templateResolver } from '#parser/liquid/resolver.ts'
import type { FullPage, Layout, Template } from '#parser/liquid/types.ts'
import { parseMarkdown } from '#parser/markdown/parser.ts'
import { renderMarkdown } from '#parser/markdown/renderer.ts'
import { logger, perf } from '#utils/log.ts'
import { resolveOutput } from '#utils/path.ts'
import { toUrl } from '#utils/url.ts'

const log = logger('Parser')

type Compiled = {
  ast: Template
  fullPageAst: FullPage
  frontmatter: Record<string, unknown>
  rendered: string
  outputPath: string
}

type CompilerOptions = {
  data: DataFileMap
  baseUrl: string
  shortCodes: RenderServices["__shortCodes__"]
  filters: RenderServices["__filters__"]
  pageData?: Record<string, unknown>
  outputRoot: string
  outputPath?: string
  layoutCache: Map<string, Layout>
}

type LayoutChain = {
  name: string,
  template: Template,
  sourcePath: string
}

export type PageContext = RenderContext & {
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
  outputRoot: string,
  baseUrl: string,
  frontmatter: Record<string, unknown>,
  pageData?: Record<string, unknown>
): PageContext {
  const core = Object.fromEntries(global.entries()) as RenderContext

  // Check if any page variables would be overwritten by frontmatter data
  for (const key of Object.keys(frontmatter)) {
    if (key in core) {
      log.warn(`Frontmatter key "${key}" overwrites core variable "${key}"`)
    }
  }

  const context = { ...core, ...frontmatter, page: {
    inputPath: input,
    outputPath: output,
    url: toUrl(baseUrl, outputRoot, output),
    ...pageData
  }}
  return context
}

async function applyLayouts (
  source: string,
  layoutName: string | undefined,
  context: RenderContext,
  layoutCache: Map<string, Layout>
): Promise<{ html: string, layoutChain: LayoutChain[] }> {
  let result = source
  let currentLayout = layoutName
  const layoutChain: LayoutChain[] = []

  while (currentLayout) {
    const layout = await layoutResolver(currentLayout, layoutCache, {
      inputRoot: config.directories.input,
      includesDir: 'includes',
      layoutsDir: 'layouts'
    })
    const layoutContext = Object.create(context)

    layoutChain.push({
      name: currentLayout,
      template: layout.template,
      sourcePath: layout.meta.source
    })

    layoutContext.content = result
    result = await render(layout.template, layoutContext, templateResolver)
    currentLayout = layout.frontmatter.layout as string | undefined
  }

  return { html: result, layoutChain }
}

export async function compile (file: string, path: string, options: CompilerOptions): Promise<Compiled> {
  const compileStart = perf('Total compiling')
  const { frontmatter, body } = extractFrontmatter(file)
  const outputPath = options.outputPath ?? resolveOutput(path, options.outputRoot, frontmatter.permalink as string)
  
  const localContext = createPageContext(
    options.data,
    path,
    outputPath,
    options.outputRoot,
    options.baseUrl,
    frontmatter,
    options.pageData)
  localContext.__shortCodes__ = options.shortCodes
  localContext.__filters__ = options.filters
  
  const bodyForLiquid =
    extname(path).toLowerCase() === '.md'
      ? renderMarkdown(parseMarkdown(body, path).body)
      : body

  const relativePath = relative(options.outputRoot, outputPath)
  const lpStart = perf(`Parsing Liquid (${relativePath})`)
  const ast = parseLiquid(bodyForLiquid, path)
  lpStart.end()
  
  const rlStart = perf('Rendering Liquid')
  const rendered = await render(ast, localContext, templateResolver)
  const { html, layoutChain } = await applyLayouts(
    rendered,
    frontmatter.layout as string | undefined,
    localContext,
    options.layoutCache)
  const fullPageAst = {
    type: 'FullPage',
    layouts: layoutChain,
    template: ast
  } satisfies FullPage
  rlStart.end()

  compileStart.end()
  return { ast, fullPageAst, frontmatter, rendered: html, outputPath }
}