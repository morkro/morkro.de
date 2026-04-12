import { copyFile , mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises"
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

type TraverseOptions = {
  dataFiles: DataFileMap
  parse: ParseExtension[]
  flatten: string[]
  skip: Set<string>
  isFlattenDir?: boolean
  userConfig?: UserConfig
}

export async function traverseDir(src: string, dest: string, traverseOptions: TraverseOptions) {
  const dir = await readdir(src)
  const { dataFiles, flatten, parse, skip, isFlattenDir = false, userConfig } = traverseOptions
  
  for (const entry of dir) {
    if (skip?.has(entry)) {
      log(`Skipping entry "${entry}"`, { lvl: 'debug' })
      continue
    }

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

      await traverseDir(srcPath, destPath, {
        dataFiles,
        parse,
        flatten,
        skip,
        isFlattenDir: shouldFlatten,
        userConfig
      })

      if (!shouldFlatten) {
        logGroupEnd()
      }
    }
    
    if (stats.isFile()) {
      const fileName = srcPath ? relative(config.directories.src, srcPath) : 'unknown'
      log(`Processing file "${fileName}"`, { type: 'group' })

      const extension = entry.split('.').pop() as ParseExtension | undefined
      if (extension && parse.includes(extension)) {
        log(`Parsing file "${entry}"`, { lvl: 'debug' })
        const raw = await readFile(srcPath, 'utf-8')
        const { rendered, outputPath } = await compile(raw, srcPath, {
          data: dataFiles,
          baseUrl: userConfig?.baseUrl ?? '',
          shortCodes: userConfig?.shortCodes ?? {}
        })

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
