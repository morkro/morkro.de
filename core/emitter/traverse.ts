import { copyFile, lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { dirname, extname, join, relative } from "node:path"
import type { ParseExtension } from "#core/config.core.ts"
import config from "#core/config.core.ts"
import type { UserConfig } from "#core/config.user.ts"
import type { DataFileMap } from "#core/data/types.ts"
import { compile } from "#parser/index.ts"
import { logger } from "#utils/log.ts"

const log = logger('Emitter')

type SourceFile = {
  srcPath: string
  destPath: string
  action: 'compile' | 'copy'
}

type DiscoverOptions = {
  parse: ParseExtension[]
  skip: Set<string>
}

type ProcessOptions = {
  dataFiles: DataFileMap
  userConfig?: UserConfig
  destRoot: string
  concurrency: number
}

export async function discoverFiles(
  src: string,
  dest: string,
  options: DiscoverOptions
): Promise<SourceFile[]> {
  const files: SourceFile[] = []
  const dir = await readdir(src)
  const { parse, skip } = options

  for (const entry of dir) {
    if (skip.has(entry)) {
      log.debug(`Skipping entry "${entry}"`)
      continue
    }

    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    const stats = await lstat(srcPath)

    if (stats.isSymbolicLink()) continue
    
    if (stats.isDirectory()) {
      if (entry.startsWith('_')) {
        log.debug(`Skipping directory "${entry}"`)
        continue
      }

      const nested = await discoverFiles(srcPath, destPath, { parse, skip })
      files.push(...nested)
      continue
    }

    if (stats.isFile()) {
      const extension = extname(entry).slice(1) as ParseExtension | undefined
      files.push({
        srcPath,
        destPath,
        action: extension && parse.includes(extension) ? 'compile' : 'copy'
      })
    }
  }

  return files
}

export async function processFiles (files: SourceFile[], options: ProcessOptions) {
  const queue = Array.from(files)
  const workers = Array.from({ length: options.concurrency }, async () => {
    while (queue.length > 0) {
      const file = queue.shift()
      if (!file) break
      await processSingleFile(file, options)
    }
  })
  await Promise.all(workers)
}

async function processSingleFile(file: SourceFile, options: ProcessOptions) {
  const fileName = relative(config.directories.src, file.srcPath)
  log.debug(`Processing file "${fileName}"`)

  if (file.action === 'compile') {
    const raw = await readFile(file.srcPath, 'utf-8')
    const { rendered, outputPath } = await compile(raw, file.srcPath, {
      data: options.dataFiles,
      baseUrl: options.userConfig?.baseUrl ?? '',
      shortCodes: options.userConfig?.shortCodes ?? {},
      filters: options.userConfig?.filters ?? {},
      destDir: options.destRoot
    })
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, rendered)
  } else {
    await mkdir(dirname(file.destPath), { recursive: true })
    await copyFile(file.srcPath, file.destPath)
  }
}