import { access, mkdir, readdir, readFile, writeFile, stat, copyFile, rm } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { DIRECTORIES, PARSE_EXTENSIONS } from '#config'
import { logSsg as log, logGroupEnd } from '#utils/log.ts'
import { startServer } from './server.ts'
import { type DataFileMap, loadDataFiles } from './data.ts'
import { compile } from '#parser/index.ts'

type TraverseOptions = {
  dataFiles: DataFileMap
  parse: typeof PARSE_EXTENSIONS
  flatten: string[]
  isFlattenDir?: boolean
}

const flattenDirectories = ['pages']

function ensureOutputPath (fileName: string, buildRoot: string, permalink?: string): string {
  const htmlName = basename(fileName, extname(fileName)) + '.html'

  if (!permalink || typeof permalink !== 'string') {
    return join(buildRoot, dirname(fileName), htmlName)
  }

  let path = permalink.trim()
  if (!path.startsWith('/')) {
    path = `/${path}`
  }

  if (path.endsWith('/')) {
    const innerPath = path.slice(1, -1)
    if (innerPath === '') {
      return join(buildRoot, htmlName)
    }
    return join(buildRoot, ...innerPath.split('/').filter(Boolean), htmlName)
  }

  return join(buildRoot, path.slice(1))
}

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
        const context = Object.fromEntries(dataFiles.entries())
        const raw = await readFile(srcPath, 'utf-8')
        const { frontmatter, rendered } = await compile(raw, srcPath, context)
        const path = ensureOutputPath(fileName, DIRECTORIES.DEST, frontmatter.permalink as string | undefined)

        log(`Writing file "${entry}"`, { lvl: 'debug' })
        log(path, { lvl: 'debug' })
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, rendered)
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
