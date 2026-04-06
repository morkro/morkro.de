import { DIRECTORIES } from '#config'
import { CUSTOM_DATA_MAPPING } from '#config.user'
import { loadFromDir, loadFromFile } from './loader.ts'
import { loadPosts } from './posts.ts'
import type { DataFileMap } from './types.ts'

export async function loadDataFiles(): Promise<DataFileMap> {
  const data = new Map([
    ...(await loadFromDir(DIRECTORIES.INTERNAL.DATA)),
    ...(await loadFromFile(CUSTOM_DATA_MAPPING)),
  ])

  const posts = await loadPosts()
  if (posts?.length > 0) {
    data.set('collections', { posts })
  }

  return data
}