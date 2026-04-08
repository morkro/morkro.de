import { DIRECTORIES } from "#config"
import { COLLECTIONS } from "#config.user"
import { parseFrontmatter, removeFrontmatter } from "#parser/frontmatter/parser.ts"
import { loadFromDir } from "./loader.ts"

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
}

function parseFilename(filename: string): { date: Date, slug: string } {
  const [year, month, day] = filename.split('-').map(Number)
  const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '')
  return {
    date: new Date(Date.UTC(year, month - 1, day)),
    slug: slug.replace(/\.md$/, ''),
  }
}

function createPost (data: string): Post {
  const frontmatter = parseFrontmatter<Post>(data)
  return {
    title: frontmatter.title,
    excerpt: frontmatter.excerpt,
    tags: frontmatter.tags,
    layout: frontmatter.layout,
    permalink: frontmatter.permalink ?? undefined,
    external: frontmatter.external ?? undefined,
  }
}

function createPostUrl (meta: { date: Date, slug: string }, pattern: string): string {
  // TODO: This needs proper parsing of the pattern
  return pattern
    .replace(`{{ page.date | date: '%Y/' }}`, new Date(meta.date).getFullYear().toString())
    .replace('{{ page.fileSlug }}', meta.slug)
}

export async function loadPosts(): Promise<CollectionPost[]> {
  const data = await loadFromDir(DIRECTORIES.INTERNAL.POSTS)
  const posts: CollectionPost[] = []

  for (const [filename, value] of data.entries()) {
    if (filename === '_posts') continue
    const raw = value as unknown as string
    const content = removeFrontmatter(raw).trim()
    const meta = parseFilename(filename)
    const post = createPost(raw)

    posts.push({
      data: post,
      // TODO: Permalink should have a default
      url: post.external?.url ?? createPostUrl(meta, COLLECTIONS.POSTS.permalink),
      date: meta.date,
      content,
    })
  }

  switch (COLLECTIONS.POSTS.sortBy) {
    case 'date':
      return posts.toSorted((a: CollectionPost, b: CollectionPost) => b.date.getTime() - a.date.getTime())
    default:
      return posts
  }
}