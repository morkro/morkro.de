import { mkdir } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import type { CoreConfig } from '#config'
import type { UserConfig } from '#config.user'
import { indexCollections } from '#data/collections.ts'
import { loadDataFiles, writeDataFilesDump } from '#data/index.ts'
import { getPassthrough, resolvePassthrough } from '#emitter/passthrough.ts'
import { type BuildItem, processFiles } from '#emitter/traverse.ts'
import { defaultEngines } from '#engines/registry.ts'
import type { Layout } from '#parser/liquid/types.ts'
import { swapDirectories, walkFiles } from '#utils/fs.ts'
import { logger } from '#utils/log.ts'

const log = logger('Build')

export async function build (config: CoreConfig, userConfig: UserConfig) {
  log.info('Building pages')
  const inputDir = resolve(config.directories.input)
  const outputDir = resolve(config.directories.output)
  const tmpDir = `${outputDir}.tmp.${Date.now()}`
  await mkdir(tmpDir, { recursive: true })

  const dataFiles = await loadDataFiles(userConfig)
  if (userConfig.debugMode) {
    await writeDataFilesDump(dataFiles, 'data.json')
  }

  const files: BuildItem[] = []
  const collectionIndex = indexCollections(dataFiles)
  const passthrough = getPassthrough(tmpDir, userConfig.passThroughCopy)

  await walkFiles(inputDir, { skip: config.directories.internal }, async (inputPath) => {
    const collection = collectionIndex.get(inputPath)
    const outputPath = collection
      ? join(tmpDir, collection.entry.url ?? '', 'index.html')
      : resolvePassthrough(inputPath, passthrough)
        ?? join(tmpDir, relative(inputDir, inputPath))

    files.push({ inputPath, outputPath, collection })
  })

  await processFiles(files, defaultEngines, {
    layoutCache: new Map<string, Layout>(),
    dataFiles,
    userConfig,
    outputRoot: tmpDir,
    concurrency: config.parser.concurrency,
  })

  try {
    await swapDirectories(tmpDir, outputDir)
  } catch (error) {
    log.error('Failed to remove old output directory', {
      error,
      from: tmpDir,
      to: outputDir,
    })
    process.exit(1)
  }

  log.info('✔ Build complete')
}