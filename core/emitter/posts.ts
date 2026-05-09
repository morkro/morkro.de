import { join } from 'node:path'
import type { UserConfig } from '#config.user'
import type { CollectionPost } from '#data/posts.ts'
import type { DataFileMap } from '#data/types.ts'
import { writeBuildArtifact } from "#emitter/output.ts"
import { compile } from '#parser/index.ts'
import { writeTempAst } from '#utils/fs.ts'
import { logger } from '#utils/log.ts'

const log = logger('Emitter')

type WritePostOptions = {
  dataFiles: DataFileMap
  userConfig?: UserConfig
}

export async function writePosts (
  posts: CollectionPost[],
  outputRoot: string,
  options: WritePostOptions
): Promise<void> {
  const errors: { name: string, error: unknown }[] = []

  for (const post of posts) {
    if (!post.meta.raw || !post.url || post.data.external) continue

    const output = join(outputRoot, post.url, 'index.html')

    try {
      const { rendered, fullPageAst, frontmatter } = await compile(post.meta.raw, post.meta.inputPath, {
        data: options.dataFiles,
        baseUrl: options.userConfig?.baseUrl ?? '',
        shortCodes: options.userConfig?.shortCodes ?? {},
        filters: options.userConfig?.filters ?? {},
        outputRoot,
        pageData: { date: post.date }
      })
      await writeBuildArtifact(rendered, output, {
        userConfig: options.userConfig
      })

      if (options.userConfig?.debugMode) {
        await writeTempAst(fullPageAst, frontmatter, post.meta.inputPath)
      }
    } catch (error) {
      errors.push({ name: post.data.title, error })
    }
  }

  if (errors.length > 0) {
    log.error('Failed to write posts', { errors: errors.length })

    for (const { name, error } of errors) {
      log.error('Failed to write post', { name, error })
    }
    
    throw new Error(`${errors.length} post(s) failed to compile`)
  }
}