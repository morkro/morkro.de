import { DIRECTORIES } from '#config'
import { CUSTOM_DATA_MAPPING } from '#config.user'
import { loadFromDir, loadFromFile } from './loader.ts'
import type { DataFileMap } from './types.ts'

export async function loadDataFiles(): Promise<DataFileMap> {
  const data = new Map([
    ...(await loadFromDir(DIRECTORIES.INTERNAL.DATA)),
    ...(await loadFromFile(CUSTOM_DATA_MAPPING)),
  ])

  const posts = await loadFromDir(DIRECTORIES.INTERNAL.POSTS)
  if (posts?.size > 0) {
    data.set('collections', { posts: Array.from(posts) })
  }

  return data
}