import { mkdir, writeFile } from "node:fs/promises"
import { dirname, extname, join } from "node:path"
import type { UserConfig } from "#config.user"
import type { CollectionPost } from "#core/data/posts.ts"
import type { DataFileMap } from "#core/data/types.ts"
import { compile } from "#parser/index.ts"
import { injectLivereloadScript } from "#server/livereload.ts"
import { logger } from "#utils/log.ts"

const log = logger('Emitter')

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
        filters: options.userConfig?.filters ?? {},
        destDir,
        pageData: { date: post.date }
      })
      let _rendered = rendered
      
      await mkdir(dirname(output), { recursive: true })

      // inject livereload script into HTML
      if (options.userConfig?.debugMode && extname(output) === '.html') {
        _rendered = injectLivereloadScript(_rendered)
      }

      log.debug(`Writing post "${post.data.title}" at "${post.url}"`)
      await writeFile(output, _rendered)
    } catch (error) {
      errors.push({ name: post.data.title, error })
    }
  }

  if (errors.length > 0) {
    log.error(`Failed to write ${errors.length} posts`)

    for (const { name, error } of errors) {
      log.error(`Failed to write post "${name}": ${error}`)
    }
    
    throw new Error(`${errors.length} post(s) failed to compile`)
  }
}