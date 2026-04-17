import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import config from '#core/config.core.ts'
import userConfig from '#core/config.user.ts'
import { loadDataFiles } from '#core/data/index.ts'
import type { CollectionPost } from '#core/data/posts.ts'
import { startServer } from '#core/server.ts'
import { copyRecursive } from '#emitter/copy.ts'
import { writePosts } from '#emitter/posts.ts'
import { discoverFiles, processFiles } from '#emitter/traverse.ts'
import { logSsg as log, perf } from '#utils/log.ts'

const flattenDirectories = ['pages']

async function build () {
  log('Building pages')
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
      log(`Copying "${src}" to "${dest}"`, { lvl: 'debug' })

      if (await copyRecursive(src, dest)) {
        skipEntries.add(relative(srcDir, src).split('/')[0])
      }
    }
  }

  /** Debug only */
  if (process.env.DEBUG) {
    await mkdir(resolve(config.directories.temp), { recursive: true })
    await writeFile(
      resolve(config.directories.temp, 'context.json'), 
        JSON.stringify(Object.fromEntries(dataFiles.entries()), null, 2))
  }

  const files = await discoverFiles(srcDir, tmpDir, {
    parse: config.parser.parseExtensions,
    flatten: flattenDirectories,
    skip: skipEntries,
  })
  await processFiles(files, {
    dataFiles,
    userConfig,
    destRoot: tmpDir,
    concurrency: config.parser.concurrency
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

  log('✔ Build complete')
}

/**
 * Execute the build process
 */
const isMainModule = import.meta.url.endsWith(process.argv[1])
if (isMainModule) { 
  const buildStart = perf('Build duration')
  try {
    await build()
  } catch (error) {
    log(`Build failed: ${error}`, { lvl: 'error' })
    process.exit(1)
  } finally {
    buildStart.end()
  }

  if (process.argv.includes('--serve')) {
    startServer()
  }
}