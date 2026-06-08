import { basename, dirname, extname, relative } from 'node:path'
import config from '#config'
import { compile } from '#core/parser/compile.ts'
import { loadFile } from '#utils/fs.ts'
import type { BuildEngine } from './types.ts'

const templateExtensions = new Set(['.html', '.xml', '.liquid', '.md'])

export function createSiteTemplateEngine(): BuildEngine {
  return {
    id: 'site-template',
    canRun: (inputPath) => templateExtensions.has(extname(inputPath)),
    async run(inputPath, outputPath, ctx) {
      const relativeFilename = relative(config.directories.input, inputPath)
      const raw = await loadFile<string>(dirname(inputPath), basename(inputPath))
      const { rendered, outputPath: resolvedOutputPath, fullPageAst, frontmatter } = await compile(raw, inputPath, {
        data: ctx.dataFiles,
        baseUrl: ctx.userConfig?.baseUrl ?? '',
        shortCodes: ctx.userConfig?.shortCodes ?? {},
        filters: ctx.userConfig?.filters ?? {},
        outputRoot: ctx.outputRoot,
        outputPath: ctx.collection ? outputPath : undefined,
        pageData: ctx.collection ? { date: ctx.collection.entry.date } : undefined,
        layoutCache: ctx.layoutCache,
      })

      return {
        artifacts: [{
          body: rendered,
          outputPath: resolvedOutputPath,
          debug: {
            fullPageAst,
            frontmatter,
            relativeFilename
          }
        }]
      }
    }
  }
}