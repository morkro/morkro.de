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
  options: WritePostOptions
): Promise<void> {
  for (const post of posts) {
    if (!post.meta.raw || !post.url || post.data.external) continue

    const output = join(config.directories.dest, post.url, 'index.html')

    try {
      const { rendered } = await compile(post.meta.raw, post.meta.srcPath, {
        data: options.dataFiles,
        baseUrl: options.userConfig?.baseUrl ?? '',
        shortCodes: options.userConfig?.shortCodes ?? {}
      })
      
      await mkdir(dirname(output), { recursive: true })
      log(`Writing post "${post.data.title}" at "${post.url}"`, { lvl: 'debug' })
      await writeFile(output, rendered)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
		  log(`Skipping post "${post.data.title}": ${message}`, { lvl: 'warn' })
    }
  }
}