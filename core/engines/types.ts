import type { UserConfig } from '#config.user'
import type { DataFileMap } from '#data/types.ts'
import type { FullPage } from '#parser/liquid/types.ts'

export type EngineContext = {
  dataFiles: DataFileMap
  userConfig?: UserConfig
  outputRoot: string
  inputRoot: string
}

export type EngineOutput = {
  body: string
  outputPath: string
  debug?: {
    fullPageAst: FullPage
    frontmatter: Record<string, unknown>
    relativeFilename: string
  }
}

export type BuildEngine = {
  id: string
  canRun: (input: string) => boolean
  run: (input: string, output: string, ctx: EngineContext) => Promise<EngineOutput>
}