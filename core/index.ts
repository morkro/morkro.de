import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import config from '#core/config.core.ts'
import userConfig from '#core/config.user.ts'
import { loadDataFiles } from '#core/data/index.ts'
import { startServer } from '#core/server.ts'
import { copyRecursive } from '#emitter/copy.ts'
import { traverseDir } from '#emitter/traverse.ts'
import { logSsg as log } from '#utils/log.ts'

const flattenDirectories = ['pages']

async function build () {
  log('Building pages')
  const srcDir = resolve(config.directories.src)
  const destDir = resolve(config.directories.dest)

  // Ensure we have a build directory
  try {
    log(`Validating "${destDir}" directory`, { lvl: 'debug' })
    await access(destDir)
    // flush dest directory
    await rm(destDir, { recursive: true })
    log('Directory flushed', { lvl: 'debug' })
  } catch {
    log(`Directory not found, creating "${destDir}"`, { lvl: 'debug' })
    await mkdir(destDir, { recursive: true })
  }

  const dataFiles = await loadDataFiles()
  const skipEntries = new Set<string>()

  if (userConfig?.passThroughCopy) {
    for (const entry of userConfig.passThroughCopy) {
      const src = resolve(entry.from)
      const dest = resolve(destDir, entry.to)
      log(`Copying "${src}" to "${dest}"`, { lvl: 'debug' })

      if (await copyRecursive(src, dest)) {
        skipEntries.add(relative(srcDir, src).split('/')[0])
      }
    }
  }

  await mkdir(resolve(config.directories.temp), { recursive: true })
  await writeFile(
    resolve(config.directories.temp, 'context.json'), 
    JSON.stringify(Object.fromEntries(dataFiles.entries()), null, 2))

  await traverseDir(srcDir, destDir, {
    dataFiles,
    parse: config.parseExtensions,
    skip: skipEntries,
    flatten: flattenDirectories
  })

  log('✔ Build complete')
}

/**
 * Execute the build process
 */
console.time('Build time')
await build()
console.timeEnd('Build time')

if (process.argv.includes('--serve')) {
  startServer()
}
