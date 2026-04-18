import { join } from 'node:path'
import config from '#core/config.core.ts'
import type { UserConfig } from '#core/config.user.ts'
import { parseFrontmatter, removeFrontmatter } from '#parser/frontmatter/parser.ts'
import { loadFromDir } from './loader.ts'

export type Post = {
  title: string
  excerpt: string
  tags: string[]
  layout: string
  permalink?: string
  external?: {
    host: string
    url: string
  }
}

export type CollectionPost = {
  data: Post
  date: Date
  url?: string
  content?: string
  meta: {
    raw: string
    srcPath: string
  }
}

function parseFilename(filename: string): { date: Date, slug: string } {
  const [year, month, day] = filename.split('-').map(Number)
  const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '')
  return {
    date: new Date(Date.UTC(year, month - 1, day)),
    slug: slug.replace(/\.md$/, ''),
  }
}

function createPost(data: string, filename: string): Post {
  const fm = parseFrontmatter(data)

  if (typeof fm.title !== 'string') {
    throw new Error(`Post "${filename}": missing "title"`)
  }
  if (typeof fm.excerpt !== 'string') {
    throw new Error(`Post "${filename}": missing "excerpt"`)
  }
  if (!Array.isArray(fm.tags)) {
    throw new Error(`Post "${filename}": missing "tags"`)
  }
  if (typeof fm.layout !== 'string') {
    throw new Error(`Post "${filename}": missing "layout"`)
  }

  return {
    title: fm.title,
    excerpt: fm.excerpt,
    tags: fm.tags as string[],
    layout: fm.layout,
    permalink: typeof fm.permalink === 'string' ? fm.permalink : undefined,
    external: fm.external as Post['external'],
  }
}

function createPostUrl (meta: { date: Date, slug: string }, pattern: string): string {
  // TODO: This needs proper parsing of the pattern
  return pattern
    .replace(`{{ page.date | date: '%Y/' }}`, new Date(meta.date).getFullYear().toString())
    .replace('{{ page.fileSlug }}', meta.slug)
}

export async function loadPosts(userConfig?: UserConfig): Promise<CollectionPost[]> {
  const data = await loadFromDir(config.directories.internal.posts)
  const posts: CollectionPost[] = []

  for (const [filename, value] of data.entries()) {
    if (filename === '_posts') continue
    const raw = value as unknown as string
    const content = removeFrontmatter(raw).trim()
    const meta = parseFilename(filename)
    const post = createPost(raw, filename)
    const srcPath = join(
      config.directories.src,
      config.directories.internal.posts,
      filename
    )

    posts.push({
      data: post,
      url: !post.external && userConfig?.collections?.posts?.permalink
        ? createPostUrl(meta, userConfig?.collections?.posts?.permalink)
        : post.external?.url
          ? undefined
          : `/${config.directories.posts}/${meta.date.getFullYear()}/${meta.slug}`,
      date: meta.date,
      content: content ? content : undefined,
      meta: { raw, srcPath }
    })
  } 

  return posts
}