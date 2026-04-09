import userConfig from '#config.user'
import config from '#core/config.core.ts'
import { loadFromDir, loadFromFile } from './loader.ts'
import { loadPosts } from './posts.ts'
import type { DataFileMap } from './types.ts'

export async function loadDataFiles(): Promise<DataFileMap> {
  const data = new Map([
    ...(await loadFromDir(config.directories.internal.data)),
  ])

  if (userConfig?.customDataMapping) {
    const customDataMapping = await loadFromFile(userConfig.customDataMapping)
    for (const [key, value] of customDataMapping.entries()) {
      data.set(key, value)
    }
  }

  const posts = await loadPosts()
  if (posts?.length > 0) {
    data.set('collections', { posts })
  }

  return data
}