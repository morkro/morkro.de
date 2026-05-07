import { lstat, readFile, readdir } from "node:fs/promises"
import { extname, join, relative, resolve } from "node:path"
import config, { type ParseExtension } from "#config"
import type { UserConfig } from "#core/config.user.ts"
import type { DataFileMap } from "#core/data/types.ts"
import { emitStaticFile, writeBuildArtifact } from "#emitter/output.ts"
import { compile } from "#parser/index.ts"
import { bundleCssImports } from "#transforms/css-imports.ts"
import { writeTempAst } from "#utils/fs.ts"
import { logger } from "#utils/log.ts"

const log = logger('Emitter')

type SourceFile = {
  inputPath: string
  outputPath: string
  action: 'compile' | 'copy'
}

type DiscoverOptions = {
  parse: ParseExtension[]
  skip: Set<string>
}

type ProcessOptions = {
  dataFiles: DataFileMap
  userConfig?: UserConfig
  outputRoot: string
  concurrency: number 
}

export async function discoverFiles(
  input: string,
  output: string,
  options: DiscoverOptions
): Promise<SourceFile[]> {
  const files: SourceFile[] = []
  const dir = await readdir(input)
  const { parse, skip } = options

  for (const entry of dir) {
    if (skip.has(entry)) {
      log.debug(`Skipping entry "${entry}"`)
      continue
    }

    const inputPath = join(input, entry)
    const outputPath = join(output, entry)
    const stats = await lstat(inputPath)

    if (stats.isSymbolicLink()) continue
    
    if (stats.isDirectory()) {
      if (entry.startsWith('_')) {
        log.debug(`Skipping directory "${entry}"`)
        continue
      }

      const nested = await discoverFiles(inputPath, outputPath, { parse, skip })
      files.push(...nested)
      continue
    }

    if (stats.isFile()) {
      const extension = extname(entry).slice(1) as ParseExtension | undefined
      files.push({
        inputPath,
        outputPath,
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
  const fileName = relative(config.directories.input, file.inputPath)
  log.debug(`Processing file "${fileName}"`)

  if (file.action === 'compile') {
    const raw = await readFile(file.inputPath, 'utf-8')
    const { rendered, outputPath, fullPageAst, frontmatter } = await compile(raw, file.inputPath, {
      data: options.dataFiles,
      baseUrl: options.userConfig?.baseUrl ?? '',
      shortCodes: options.userConfig?.shortCodes ?? {},
      filters: options.userConfig?.filters ?? {},
      outputRoot: options.outputRoot
    })
    await writeBuildArtifact(rendered, outputPath, {
      userConfig: options.userConfig
    })

    if (options.userConfig?.debugMode) {
      await writeTempAst(fullPageAst, frontmatter, fileName)
    }
  } else {
    if (extname(file.inputPath) === '.css') {
      const css = await readFile(file.inputPath, 'utf-8')
      const inputRoot = resolve(config.directories.input)
      const bundled = await bundleCssImports(css, file.inputPath, inputRoot)
      await writeBuildArtifact(bundled, file.outputPath, {
        userConfig: options.userConfig
      })
      return
    }

    await emitStaticFile(file.inputPath, file.outputPath, {
      userConfig: options.userConfig
    })
  }
}