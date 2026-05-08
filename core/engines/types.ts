import type { DataFileMap } from "#core/data/types.ts"
import type { FullPage } from "#parser/liquid/types.ts"
import type { UserConfig } from "#config.user"

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