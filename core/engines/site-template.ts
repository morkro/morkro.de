import { extname, relative } from 'node:path';
import { readFile } from 'node:fs/promises';
import config, { type ParseExtension } from '#config';
import { compile } from '#parser/index.ts';
import type { BuildEngine } from './types.ts';

const templateExtensions = new Set<ParseExtension>(config.parser.parseExtensions)

export function createSiteTemplateEngine(): BuildEngine {
  return {
    id: 'site-template',
    canRun: (inputPath) => templateExtensions.has(extname(inputPath) as ParseExtension),
    async run(inputPath, _, ctx) {
      const relativeFileName = relative(config.directories.input, inputPath)
      const raw = await readFile(inputPath, 'utf-8')
      const { rendered, outputPath, fullPageAst, frontmatter } = await compile(raw, inputPath, {
        data: ctx.dataFiles,
        baseUrl: ctx.userConfig?.baseUrl ?? '',
        shortCodes: ctx.userConfig?.shortCodes ?? {},
        filters: ctx.userConfig?.filters ?? {},
        outputRoot: ctx.outputRoot
      })

      return {
        body: rendered,
        outputPath,
        debug: {
          fullPageAst,
          frontmatter,
          relativeFilename: relativeFileName
        }
      }
    }
  }
}