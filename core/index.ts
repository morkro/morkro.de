import { access, copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import config, { type ParseExtension } from '#core/config.core.ts'
import { loadDataFiles } from '#core/data/index.ts'
import type { DataFileMap } from '#core/data/types.ts'
import { compile } from '#parser/index.ts'
import { logSsg as log, logGroupEnd } from '#utils/log.ts'
import { startServer } from './server.ts'

type TraverseOptions = {
  dataFiles: DataFileMap
  parse: ParseExtension[]
  flatten: string[]
  isFlattenDir?: boolean
}

const flattenDirectories = ['pages']

async function traverseDir(src: string, dest: string, traverseOptions: TraverseOptions) {
  const dir = await readdir(src)
  const { dataFiles, flatten, parse, isFlattenDir = false } = traverseOptions
  
  for (const entry of dir) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    const stats = await stat(srcPath)

    if (stats.isDirectory()) {
      if (entry.startsWith('_')) {
        log(`Skipping directory "${entry}"`, { lvl: 'debug' })
        continue
      }

      const shouldFlatten = flatten.includes(entry) || isFlattenDir
      if (!shouldFlatten) { 
        const dirPath = destPath ? relative(config.directories.src, srcPath) : 'unknown'
        log(`Scanning directory "${dirPath}/":`, { type: 'group' })
        await mkdir(`${destPath}`, { recursive: true })
      }

      await traverseDir(srcPath, `${destPath}`, {
        dataFiles,
        parse,
        flatten,
        isFlattenDir: shouldFlatten
      })

      if (!shouldFlatten) {
        logGroupEnd()
      }
    } else if (stats.isFile()) {
      const fileName = srcPath ? relative(config.directories.src, srcPath) : 'unknown'
      log(`Processing file "${fileName}"`, { type: 'group' })

      const extension = entry.split('.').pop() as ParseExtension | undefined
      if (extension && parse.includes(extension)) {
        log(`Parsing file "${entry}"`, { lvl: 'debug' })
        const raw = await readFile(srcPath, 'utf-8')
        const { rendered, outputPath } = await compile(raw, srcPath, dataFiles)

        log(`Writing file "${entry}"`, { lvl: 'debug' })
        log(outputPath, { lvl: 'debug' })
        await mkdir(dirname(outputPath), { recursive: true })
        await writeFile(outputPath, rendered)
      } else {
        await copyFile(srcPath, `${destPath}`)
      }

      logGroupEnd()
    }
  }
}

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

  await mkdir(resolve(config.directories.temp), { recursive: true })
  await writeFile(
    resolve(config.directories.temp, 'context.json'), 
    JSON.stringify(Object.fromEntries(dataFiles.entries()), null, 2))

  await traverseDir(srcDir, destDir, {
    dataFiles,
    parse: config.parseExtensions,
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
