import { lstat, readdir } from 'node:fs/promises'
import { join, relative, resolve } from "node:path"
import config from '#config'
import type { UserConfig } from '#config.user'
import type { DataFileMap } from '#data/types.ts'
import { emitStaticFile, writeBuildArtifact } from '#emitter/output.ts'
import { writeTempAst } from '#utils/fs.ts'
import { logger } from '#utils/log.ts'
import { defaultEngines, resolveEngine } from '#engines/registry.ts'
import type { BuildEngine } from '#engines/types.ts'

const log = logger('Emitter')

type BuildItem = {
  inputPath: string
  outputPath: string
}

type ProcessOptions = {
  dataFiles: DataFileMap
  userConfig?: UserConfig
  outputRoot: string
  concurrency: number 
}

export async function discoverFiles(
  input: string,
  output: string,
  options: { skip: Set<string> }
): Promise<BuildItem[]> {
  const files: BuildItem[] = []
  const dir = await readdir(input)

  for (const entry of dir) {
    if (options.skip.has(entry)) {
      log.debug(`Skipping entry "${entry}"`)
      continue
    }

    const inputPath = join(input, entry)
    const outputPath = join(output, entry)
    const stats = await lstat(inputPath)

    if (stats.isSymbolicLink()) continue
    
    if (stats.isDirectory()) {
      if (entry.startsWith('_')) {
        log.debug(`Skipping directory "${entry}"`)
        continue
      }

      const nested = await discoverFiles(inputPath, outputPath, { skip: options.skip })
      files.push(...nested)
      continue
    }

    if (stats.isFile()) {
      files.push({ inputPath, outputPath })
    }
  }

  return files
}

export async function processFiles (
  files: BuildItem[],
  engines: BuildEngine[] = defaultEngines,
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
    const { body, outputPath, debug } = await engine.run(
      file.inputPath,
      file.outputPath,
      {
        dataFiles: options.dataFiles,
        userConfig: options.userConfig,
        outputRoot: options.outputRoot,
        inputRoot: resolve(config.directories.input)
      }
		)

    await writeBuildArtifact(body, outputPath, {
      userConfig: options.userConfig
    })

    if (options.userConfig?.debugMode && debug) {
      await writeTempAst(
        debug.fullPageAst,
        debug.frontmatter,
        debug.relativeFilename
      )
    }

    return
  }

  await emitStaticFile(file.inputPath, file.outputPath, {
    userConfig: options.userConfig
  })
}