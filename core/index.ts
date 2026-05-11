import { mkdir, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import config from '#config'
import userConfig, { type UserConfig } from '#config.user'
import { loadDataFiles } from '#data/index.ts'
import { writeCollection } from '#emitter/collections.ts'
import { copyRecursive } from '#emitter/copy.ts'
import { processFiles } from '#emitter/traverse.ts'
import { defaultEngines } from "#engines/registry.ts"
import { startServer } from '#server/index.ts'
import { startWatcher } from '#server/watcher.ts'
import { broadcastReload } from '#transforms/livereload.ts'
import { swapDirectories, walkFiles } from '#utils/fs.ts'
import { logger, perf } from '#utils/log.ts'

const log = logger('Build')

async function getSkipEntries (
  input: string,
  output: string,
  userConfig: UserConfig
): Promise<Set<string>> {
  const entries = new Set<string>(config.directories.internal)

  if (userConfig?.passThroughCopy) {
    for (const entry of userConfig.passThroughCopy) {
      const from = resolve(entry.from)
      const to = resolve(output, entry.to)

      // TODO: This is a side-effect and should be moved to a separate function
      const result = await copyRecursive(from, to)
      if (result.ok) {
        entries.add(relative(input, result.inputPath).split('/')[0])
      }
    }
  }

  if (userConfig?.collections) {
    for (const [_, spec] of userConfig.collections) {
      entries.add(spec.input)
    }
  }

  return entries
}

async function build () {
  log.info('Building pages')
  const inputDir = resolve(config.directories.input)
  const outputDir = resolve(config.directories.output)
  const tmpDir = `${outputDir}.tmp.${Date.now()}`
  await mkdir(tmpDir, { recursive: true })

  const skip = await getSkipEntries(inputDir, tmpDir, userConfig)
  const dataFiles = await loadDataFiles(userConfig)

  /** Debug only */
  if (userConfig.debugMode) {
    log.debug('Writing data files to temporary directory')
    await mkdir(resolve(config.directories.temp), { recursive: true })
    await writeFile(
      resolve(config.directories.temp, 'context.json'), 
        JSON.stringify(Object.fromEntries(dataFiles.entries()), null, 2))
  }

  const files: { inputPath: string, outputPath: string }[] = []
  await walkFiles(inputDir, { skip }, async (inputPath) => {
    const outputPath = join(tmpDir, relative(inputDir, inputPath))
    files.push({ inputPath, outputPath })
  })

  await processFiles(files, defaultEngines, {
    dataFiles,
    userConfig,
    outputRoot: tmpDir,
    concurrency: config.parser.concurrency,
  })

  const collections = dataFiles.get('collections')
  if (collections && Object.keys(collections).length > 0) {
    for (const [name, collection] of Object.entries(collections)) {
      if (!collection || !Array.isArray(collection)) {
        continue
      }
      for (const entry of collection) {
        await writeCollection(
          name,
          entry,
          tmpDir,
          { dataFiles, userConfig }
        )
      }
    }
  }

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