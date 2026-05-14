import { join } from 'node:path'
import type { UserConfig } from '#config.user'
import type { CollectionEntry } from '#data/collections.ts'
import type { DataFileMap } from "#data/index.ts"
import { writeBuildArtifact } from '#emitter/output.ts'
import { compile } from '#parser/compile.ts'
import { writeTempAst } from '#utils/fs.ts'
import { logger } from '#utils/log.ts'

const log = logger('Emitter')

export async function writeCollection(
  name: string,
  collection: CollectionEntry,
  outputRoot: string,
  { dataFiles, userConfig }: { dataFiles: DataFileMap, userConfig: UserConfig }
) {
  if (!collection.meta.raw || !collection.url) return

  const output = join(outputRoot, collection.url, 'index.html')

  try {
    const { rendered, fullPageAst, frontmatter } = await compile(collection.meta.raw, collection.meta.inputPath, {
      data: dataFiles,
      baseUrl: userConfig?.baseUrl ?? '',
      shortCodes: userConfig?.shortCodes ?? {},
      filters: userConfig?.filters ?? {},
      outputRoot,
      pageData: { date: collection.date }
    })
    await writeBuildArtifact(rendered, output, { userConfig })

    if (userConfig?.debugMode) {
      await writeTempAst(fullPageAst, frontmatter, collection.meta.inputPath)
    }
  } catch (error) {
    log.error('Failed to write collection', { name, error })
    throw error
  }
}