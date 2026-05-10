import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import config from '#config'
import userConfig from '#config.user'
import { loadDataFiles } from '#core/data/index.ts'
import { getCollections } from '#core/data/posts.ts'
import { startServer } from '#core/server/index.ts'
import { copyRecursive } from '#emitter/copy.ts'
import { writePosts } from '#emitter/posts.ts'
import { discoverFiles, processFiles } from '#emitter/traverse.ts'
import { broadcastReload } from '#transforms/livereload.ts'
import { startWatcher } from '#server/watcher.ts'
import { logger, perf } from '#utils/log.ts'
import { defaultEngines } from "#core/engines/registry.ts"

const log = logger('Build')

async function safeRename(from: string, to: string) {
	try {
		await rename(from, to)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return
    }
		throw new Error(`Failed to rename "${from}" -> "${to}"`, { cause: error })
	}
}

async function build () {
  log.info('Building pages')
  const inputDir = resolve(config.directories.input)
  const outputDir = resolve(config.directories.output)

  // Create a temporary directory to store the build files
  const tmpDir = `${outputDir}.tmp.${Date.now()}`
  await mkdir(tmpDir, { recursive: true })

  const dataFiles = await loadDataFiles(userConfig)
  const skipEntries = new Set<string>()

  if (userConfig?.passThroughCopy) {
    for (const entry of userConfig.passThroughCopy) {
      const input = resolve(entry.from)
      const output = resolve(tmpDir, entry.to)

      const result = await copyRecursive(input, output)
      if (result.ok) {
        skipEntries.add(relative(inputDir, result.inputPath).split('/')[0])
      }
    }
  }

  /** Debug only */
  if (userConfig.debugMode) {
    log.debug('Writing data files to temporary directory')
    await mkdir(resolve(config.directories.temp), { recursive: true })
    await writeFile(
      resolve(config.directories.temp, 'context.json'), 
        JSON.stringify(Object.fromEntries(dataFiles.entries()), null, 2))
  }

  const files = await discoverFiles(inputDir, tmpDir, {
    skip: skipEntries,
  })
  await processFiles(files, defaultEngines, {
    dataFiles,
    userConfig,
    outputRoot: tmpDir,
    concurrency: config.parser.concurrency,
  })

  const collections = getCollections(dataFiles)
  if (collections?.posts && collections.posts.length > 0) {
    await writePosts(collections.posts, tmpDir, { dataFiles, userConfig })
  }

  // Swap tmp with old
  const oldOutput = `${outputDir}.old`
  await safeRename(outputDir, oldOutput)
  await safeRename(tmpDir, outputDir)
  try {
    await rm(oldOutput, { recursive: true })
  } catch (error) {
    log.error('Failed to remove old output directory', { error, oldOutput })
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