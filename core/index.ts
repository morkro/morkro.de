import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import config from '#core/config.core.ts'
import userConfig from '#core/config.user.ts'
import { loadDataFiles } from '#core/data/index.ts'
import type { CollectionPost } from '#core/data/posts.ts'
import { startServer } from '#core/server/index.ts'
import { copyRecursive } from '#emitter/copy.ts'
import { writePosts } from '#emitter/posts.ts'
import { discoverFiles, processFiles } from '#emitter/traverse.ts'
import { broadcastReload } from '#server/livereload.ts'
import { startWatcher } from '#server/watcher.ts'
import { logger, perf } from '#utils/log.ts'

const log = logger('Build')

async function build () {
  log.info('Building pages')
  const srcDir = resolve(config.directories.src)
  const destDir = resolve(config.directories.dest)

  // Create a temporary directory to store the build files
  const tmpDir = `${destDir}.tmp.${Date.now()}`
  await mkdir(tmpDir, { recursive: true })

  const dataFiles = await loadDataFiles(userConfig)
  const skipEntries = new Set<string>()

  if (userConfig?.passThroughCopy) {
    for (const entry of userConfig.passThroughCopy) {
      const src = resolve(entry.from)
      const dest = resolve(tmpDir, entry.to)

      if (await copyRecursive(src, dest)) {
        skipEntries.add(relative(srcDir, src).split('/')[0])
      }
    }
  }

  /** Debug only */
  if (process.env.DEBUG) {
    log.debug('Writing data files to temporary directory')
    await mkdir(resolve(config.directories.temp), { recursive: true })
    await writeFile(
      resolve(config.directories.temp, 'context.json'), 
        JSON.stringify(Object.fromEntries(dataFiles.entries()), null, 2))
  }

  const files = await discoverFiles(srcDir, tmpDir, {
    parse: config.parser.parseExtensions,
    skip: skipEntries,
  })
  await processFiles(files, {
    dataFiles,
    userConfig,
    destRoot: tmpDir,
    concurrency: config.parser.concurrency,
  })

  const collections = dataFiles.get('collections') as { posts: CollectionPost[] } | undefined
  if (collections?.posts) {
    await writePosts(collections.posts, tmpDir, { dataFiles, userConfig })
  }

  // Swap tmp with old
  const oldDest = `${destDir}.old`
  try { await rename(destDir, oldDest) } catch {}
  await rename(tmpDir, destDir)
  try { await rm(oldDest, { recursive: true }) } catch {}

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
    log.error(error)
    process.exit(1)
  } finally {
    buildStart.end()
  }
  
  if (process.argv.includes('--serve')) {
    startServer()
    broadcastReload()

    const watcher = startWatcher(async () => {
      await build()
      broadcastReload()
    })
    process.on('SIGINT', () => {
      watcher?.stop()
      process.exit(0)
    })
  }
}