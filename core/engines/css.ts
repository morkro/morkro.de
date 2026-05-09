import { extname } from 'node:path'
import { readFile } from 'node:fs/promises'
import { bundleCssImports } from '#transforms/css-imports.ts'
import { type BuildEngine, type EngineOutput } from './types.ts'

export function createCssEngine(): BuildEngine {
  return {
    id: 'css',
    canRun: (inputPath) => extname(inputPath) === '.css',
    async run(inputPath, outputPath, ctx): Promise<EngineOutput> {
      const raw = await readFile(inputPath, 'utf-8')
      const body = await bundleCssImports(raw, inputPath, ctx.inputRoot)
      
      return { body, outputPath }
    }
  }
}