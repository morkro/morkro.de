import { basename, dirname, extname } from 'node:path'
import { bundleCssImports } from '#transforms/css-imports.ts'
import { type BuildEngine } from './types.ts'
import { loadFile } from '#core/utils/fs.ts'

export function createCssEngine(): BuildEngine {
  return {
    id: 'css',
    canRun: (inputPath) => extname(inputPath) === '.css',
    async run(inputPath, outputPath, ctx) {
      const raw = await loadFile<string>(dirname(inputPath), basename(inputPath))
      const body = await bundleCssImports(raw, inputPath, ctx.inputRoot)
      
      return { artifacts: [{ body, outputPath }] }
    }
  }
}