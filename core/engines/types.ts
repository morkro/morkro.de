import type { UserConfig } from '#config.user'
import type { DataFileMap } from '#data/index.ts'
import type { CollectionMatch } from '#emitter/traverse.ts'
import type { FullPage } from '#parser/liquid/types.ts'

export type EngineContext = {
  dataFiles: DataFileMap
  userConfig?: UserConfig
  outputRoot: string
  inputRoot: string
  collection?: CollectionMatch
}

export type EngineArtifact = {
  body: string
  outputPath: string
  debug?: {
    fullPageAst: FullPage
    frontmatter: Record<string, unknown>
    relativeFilename: string
  }
}

export type EngineOutput = {
	artifacts: EngineArtifact[]
}

export type BuildEngine = {
  id: string
  canRun: (input: string) => boolean
  run: (input: string, output: string, ctx: EngineContext) => Promise<EngineOutput>
}