import { relative, resolve } from "node:path"
import config from '#config'
import type { UserConfig } from '#config.user'
import type { CollectionEntry } from "#data/collections.ts"
import type { DataFileMap } from '#data/index.ts'
import { emitStaticFile, writeBuildArtifact } from '#emitter/output.ts'
import { resolveEngine } from '#engines/registry.ts'
import type { BuildEngine } from '#engines/types.ts'
import type { Layout } from '#parser/liquid/types.ts'
import { writeTempAst } from '#utils/fs.ts'
import { logger } from '#utils/log.ts'

const log = logger('Emitter')

export type CollectionMatch = {
  name: string
  entry: CollectionEntry
}

export type BuildItem = {
  inputPath: string
  outputPath: string
  collection?: CollectionMatch
}

type ProcessOptions = {
  layoutCache: Map<string, Layout>
  dataFiles: DataFileMap
  userConfig?: UserConfig
  outputRoot: string
  concurrency: number 
}

export async function processFiles (
  files: BuildItem[],
  engines: BuildEngine[],
  options: ProcessOptions
) {
  const queue = Array.from(files)
  const workers = Array.from({ length: options.concurrency }, async () => {
    while (queue.length > 0) {
      const file = queue.shift()
      if (!file) break
      await processSingleFile(file, engines, options)
    }
  })
  await Promise.all(workers)
}

async function processSingleFile(file: BuildItem, engines: BuildEngine[], options: ProcessOptions) {
  const fileName = relative(config.directories.input, file.inputPath)
  const engine = resolveEngine(engines, file.inputPath)
  log.debug(`Processing file "${fileName}"`)

  if (engine) {
    const { artifacts } = await engine.run(
      file.inputPath,
      file.outputPath,
      {
        layoutCache: options.layoutCache,
        dataFiles: options.dataFiles,
        userConfig: options.userConfig,
        outputRoot: options.outputRoot,
        inputRoot: resolve(config.directories.input),
        collection: file.collection
      }
		)

    for (const artifact of artifacts) {
      await writeBuildArtifact(artifact.body, artifact.outputPath, {
        userConfig: options.userConfig
      })

      if (options.userConfig?.debugMode && artifact.debug) {
        await writeTempAst(
          artifact.debug.fullPageAst,
          artifact.debug.frontmatter,
          artifact.debug.relativeFilename
        )
      }
    }

    return
  }

  await emitStaticFile(file.inputPath, file.outputPath, {
    userConfig: options.userConfig
  })
}