import { mkdir, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import config from '#config'
import userConfig from '#config.user'
import { indexCollections } from '#data/collections.ts'
import { loadDataFiles, writeDataFilesDump } from '#data/index.ts'
import { getPassthrough, resolvePassthrough } from '#emitter/passthrough.ts'
import { type BuildItem, processFiles } from '#emitter/traverse.ts'
import { defaultEngines } from "#engines/registry.ts"
import { startServer } from '#server/index.ts'
import { startWatcher } from '#server/watcher.ts'
import { broadcastReload } from '#transforms/livereload.ts'
import { swapDirectories, walkFiles } from '#utils/fs.ts'
import { logger, perf } from '#utils/log.ts'

const log = logger('Build')

async function build () {
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

/**
 * Execute the build process
 */
const isMainModule = import.meta.filename === resolve(process.argv[1])
if (isMainModule) { 
  const buildStart = perf('Build duration')
  log.info(`Build settings NODE_ENV=${process.env.NODE_ENV}, DEBUG=${process.env.DEBUG}`)
  
  try {
    await build()
  } catch (error) {
    log.error('Build failed', { error })
    process.exit(1)
  } finally {
    buildStart.end()
  }
  
  if (process.argv.includes('--serve')) {
    const server = startServer()
    broadcastReload()
    const watcher = startWatcher(async () => {
      await build()
      broadcastReload()
    })
    process.on('SIGINT', async () => {
      await server.stop()
      watcher.stop()
      process.exit(0)
    })
  }
}