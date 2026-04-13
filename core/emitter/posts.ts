import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { UserConfig } from "#config.user"
import config from "#core/config.core.ts"
import type { CollectionPost } from "#core/data/posts.ts"
import type { DataFileMap } from "#core/data/types.ts"
import { compile } from "#parser/index.ts"
import { log } from "#utils/log.ts"

type WritePostOptions = {
  dataFiles: DataFileMap
  userConfig?: UserConfig
}

export async function writePosts (
  posts: CollectionPost[],
  destDir: string,
  options: WritePostOptions
): Promise<void> {
  const errors: { name: string, error: unknown }[] = []

  for (const post of posts) {
    if (!post.meta.raw || !post.url || post.data.external) continue

    const output = join(destDir, post.url, 'index.html')

    try {
      const { rendered } = await compile(post.meta.raw, post.meta.srcPath, {
        data: options.dataFiles,
        baseUrl: options.userConfig?.baseUrl ?? '',
        shortCodes: options.userConfig?.shortCodes ?? {},
        destDir
      })
      
      await mkdir(dirname(output), { recursive: true })
      log(`Writing post "${post.data.title}" at "${post.url}"`, { lvl: 'debug' })
      await writeFile(output, rendered)
    } catch (error) {
      errors.push({ name: post.data.title, error })
    }
  }

  if (errors.length > 0) {
    log(`Failed to write ${errors.length} posts`, { lvl: 'error' })

    for (const { name, error } of errors) {
      log(`Failed to write post "${name}": ${error}`, { lvl: 'error' })
    }
    
    throw new Error(`${errors.length} post(s) failed to compile`)
  }
}