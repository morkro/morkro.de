import { copyFile, lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { relative } from "node:path"
import { dirname } from "node:path"
import type { ParseExtension } from "#core/config.core.ts"
import config from "#core/config.core.ts"
import type { UserConfig } from "#core/config.user.ts"
import type { DataFileMap } from "#core/data/types.ts"
import { compile } from "#parser/index.ts"
import { log } from "#utils/log.ts"
import { logGroupEnd } from "#utils/log.ts"

type SourceFile = {
  srcPath: string
  destPath: string
  action: 'compile' | 'copy'
}

type DiscoverOptions = {
  parse: ParseExtension[]
  flatten: string[]
  skip: Set<string>
  isFlattenDir?: boolean
}

type ProcessOptions = {
  dataFiles: DataFileMap
  userConfig?: UserConfig
  destRoot: string
}

export async function discoverFiles(
  src: string,
  dest: string,
  options: DiscoverOptions
): Promise<SourceFile[]> {
  const files: SourceFile[] = []
  const dir = await readdir(src)
  const { parse, flatten, skip, isFlattenDir = false } = options

  for (const entry of dir) {
    if (skip.has(entry)) {
      log(`Skipping entry "${entry}"`, { lvl: 'debug', d: 'emitter' })
      continue
    }

    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    const stats = await lstat(srcPath)

    if (stats.isSymbolicLink()) continue
    
    if (stats.isDirectory()) {
      if (entry.startsWith('_')) {
        log(`Skipping directory "${entry}"`, { lvl: 'debug', d: 'emitter' })
        continue
      }

      const shouldFlatten = flatten.includes(entry) || isFlattenDir
      const nested = await discoverFiles(srcPath, destPath, {
        parse,
        flatten,
        skip,
        isFlattenDir: shouldFlatten
      })

      files.push(...nested)
      continue
    }

    if (stats.isFile()) {
      const extension = entry.split('.').pop() as ParseExtension | undefined
      files.push({
        srcPath,
        destPath,
        action: extension && parse.includes(extension) ? 'compile' : 'copy'
      })
    }
  }

  return files
}

export async function processFiles(files: SourceFile[], options: ProcessOptions) {
  for (const file of files) {
    const fileName = relative(config.directories.src, file.srcPath)
    log(`Processing file "${fileName}"`, { type: 'group' })

    if (file.action === 'compile') {
      const raw = await readFile(file.srcPath, 'utf-8')
      const { rendered, outputPath } = await compile(raw, file.srcPath, {
        data: options.dataFiles,
        baseUrl: options.userConfig?.baseUrl ?? '',
        shortCodes: options.userConfig?.shortCodes ?? {},
        destDir: options.destRoot
      })
      await mkdir(dirname(outputPath), { recursive: true })
      await writeFile(outputPath, rendered)
    } else {
      await mkdir(dirname(file.destPath), { recursive: true })
      await copyFile(file.srcPath, file.destPath)
    }

    logGroupEnd()
  }
}