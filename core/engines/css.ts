import { basename, dirname, extname } from 'node:path'
import { bundleCssImports } from '#transforms/css-imports.ts'
import { type BuildEngine, type EngineOutput } from './types.ts'
import { loadFile } from '#core/utils/fs.ts'

export function createCssEngine(): BuildEngine {
  return {
    id: 'css',
    canRun: (inputPath) => extname(inputPath) === '.css',
    async run(inputPath, outputPath, ctx): Promise<EngineOutput> {
      const raw = await loadFile(dirname(inputPath), basename(inputPath))
      const body = await bundleCssImports(raw, inputPath, ctx.inputRoot)
      
      return { body, outputPath }
    }
  }
}