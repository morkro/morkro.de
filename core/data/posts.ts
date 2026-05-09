import { join } from 'node:path'
import config from '#config'
import type { UserConfig } from '#config.user'
import { parseFrontmatter, removeFrontmatter } from '#parser/frontmatter/parser.ts'
import { applyFilter } from '#parser/liquid/filters.ts'
import { stripQuotes } from '#parser/utils.ts'
import { getFromObject } from '#utils/object.ts'
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

type PermalinkContext = {
  page: {
    date: Date
    slug: string
  }
}

export type CollectionPost = {
  data: Post
  date: Date
  url?: string
  content?: string
  meta: {
    raw: string
    inputPath: string
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

function createPostData(data: string, filename: string): Post {
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

function evalPermalinkExpression (expression: string, context: PermalinkContext, userConfig?: UserConfig): string {
  const parts = expression.split('|').map(part => part.trim())
  const base = parts.shift()
  if (!base) throw new Error(`Invalid permalink expression: ${expression}`)

  let value = getFromObject(base.split('.').map(part => part.trim()), context)

  for (const part of parts) {
    const match = part.match(/^(\w+)(?::(.*))?$/)
    if (!match) {
      throw new Error('Empty permalink filter expression')
    }
    const args = match[2]
      ? match[2].split(',').map(arg => stripQuotes(arg.trim()))
      : []
    value = applyFilter(match[1], value, args, userConfig?.filters ?? {})
  }

  return value as string
}

function createPostUrl (context: PermalinkContext, pattern: string, userConfig?: UserConfig): string {
  const resolved = pattern.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expression) => 
    evalPermalinkExpression(expression, context, userConfig))
  const normalised = resolved.replace(/\/{2,}/g, '/')

  return normalised.startsWith('/') ? normalised : `/${normalised}`
}

export async function loadPosts(userConfig?: UserConfig): Promise<CollectionPost[]> {
  const data = await loadFromDir(config.directories.internal.posts)
  const posts: CollectionPost[] = []

  for (const [filename, value] of data.entries()) {
    if (filename === '_posts') continue
    const raw = value as unknown as string
    const content = removeFrontmatter(raw).trim()
    const meta = parseFilename(filename)
    const post = createPostData(raw, filename)
    const inputPath = join(
      config.directories.input,
      config.directories.internal.posts,
      filename
    )

    posts.push({
      data: post,
      url: !post.external && userConfig?.collections?.posts?.permalink
        ? createPostUrl({ page: meta }, userConfig?.collections?.posts?.permalink, userConfig)
        : post.external?.url
          ? undefined
          : `/posts/${meta.date.getFullYear()}/${meta.slug}`,
      date: meta.date,
      content: content ? content : undefined,
      meta: { raw, inputPath }
    })
  } 

  const { sortBy, sortOrder } = userConfig?.collections?.posts ?? {}
  const direction = sortOrder === 'asc' ? 1 : -1

  posts.sort((a, b) => {
    if (sortBy === 'title') {
      return a.data.title.localeCompare(b.data.title) * direction
    }
    return (a.date.getTime() - b.date.getTime()) * direction
  })

  return posts
}