import { access, mkdir, readdir, readFile, writeFile, stat, copyFile, rm } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { DIRECTORIES, PARSE_EXTENSIONS } from '#config'
import { logSsg as log, logGroupEnd } from '#utils/log.ts'
import { startServer } from './server.ts'
import { parseFile } from './parser/parser.ts'
import { type DataFileMap, loadDataFiles } from './data.ts'

type TraverseOptions = {
  dataFiles: DataFileMap
  parse: typeof PARSE_EXTENSIONS
  flatten: string[]
  isFlattenDir?: boolean
}

const flattenDirectories = ['pages']

async function traverseDir(src: string, dest: string, config: TraverseOptions) {
  const dir = await readdir(src)
  const { dataFiles, flatten, parse, isFlattenDir = false } = config
  
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
        const dirPath = destPath ? relative(DIRECTORIES.SRC, srcPath) : 'unknown'
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
      const fileName = srcPath ? relative(DIRECTORIES.SRC, srcPath) : 'unknown'
      log(`Processing file "${fileName}"`, { type: 'group' })

      const extension = entry.split('.').pop() as typeof PARSE_EXTENSIONS[number] | undefined
      if (extension && parse.includes(extension)) {
        log(`Parsing file "${entry}"`, { lvl: 'debug' })
        const parsed = await parseFile(
          await readFile(srcPath, 'utf-8'), srcPath, dataFiles)
        let path = destPath
        if (parsed.meta.permalink) {
          log(DIRECTORIES.DEST, { lvl: 'debug' })
          if (parsed.meta.permalink.endsWith('/')) {
            path = `${DIRECTORIES.DEST}${parsed.meta.permalink}${entry}`
          } else {
            path = `${DIRECTORIES.DEST}${parsed.meta.permalink}`
          }
        }

        log(`Writing file "${entry}"`, { lvl: 'debug' })
        log(path, { lvl: 'debug' })
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, parsed.content)
      } else {
        await copyFile(srcPath, `${destPath}`)
      }

      logGroupEnd()
    }
  }
}

async function build () {
  log('Building pages')
  const srcDir = resolve(DIRECTORIES.SRC)
  const destDir = resolve(DIRECTORIES.DEST)

  // Ensure we have a build directory
  try {
    log(`Validating "${destDir}" directory`, { lvl: 'debug' })
    await access(destDir)
    // flush dest directory
    await rm(destDir, { recursive: true })
    log(`Directory flushed`, { lvl: 'debug' })
  } catch {
    log(`Directory not found, creating "${destDir}"`, { lvl: 'debug' })
    await mkdir(destDir, { recursive: true })
  }

  await traverseDir(srcDir, destDir, {
    dataFiles: await loadDataFiles(),
    parse: PARSE_EXTENSIONS,
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
