import { join } from 'node:path'
import config from '#config'
import type { CollectionSource, UserConfig } from '#config.user'
import { parseFrontmatter, removeFrontmatter } from '#parser/frontmatter/parser.ts'
import { applyFilter } from '#parser/liquid/filters.ts'
import { stripQuotes } from '#parser/utils.ts'
import { getFromObject } from '#utils/object.ts'
import { loadFromDir } from "./loader.ts"

export type CollectionEntry = {
  url?: string
  date: Date
  data: {
    title: string
    tags: string[]
    [key: string]: string | number | boolean | string[] | undefined | Date
  }
  content: string
  meta: {
    permalink: string
    raw: string
    inputPath: string
    collectionName: string
    collectionSpec: CollectionSource
  }
}

type PermalinkContext = {
  page: {
    date: Date
    slug: string
  }
}

function parseFilename(filename: string): { date: Date, slug: string } {
  const [year, month, day] = filename.split('-').map(Number)
  const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '')
  return {
    date: year && month && day
      ? new Date(Date.UTC(year, month - 1, day))
      : new Date(),
    slug: slug.replace(/\.md$/, ''),
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

function createCollectionUrl (context: PermalinkContext, pattern: string, userConfig?: UserConfig): string {
  const resolved = pattern.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expression) => 
    evalPermalinkExpression(expression, context, userConfig))
  const normalised = resolved.replace(/\/{2,}/g, '/')

  return normalised.startsWith('/') ? normalised : `/${normalised}`
}

function createCollectionData(filename: string, value: unknown): CollectionEntry['data'] {
  const fm = parseFrontmatter(value as unknown as string)
  return {
    ...fm,
    title: String(fm.title ?? filename),
    tags: fm.tags as string[]
  }
}

export async function loadCollection(
  name: string,
  spec: CollectionSource,
  userConfig?: UserConfig,
): Promise<CollectionEntry[]> {
  const entries: CollectionEntry[] = []
  const data = await loadFromDir(spec.input)
  
  for (const [filename, value] of data.entries()) {
    const raw = value as unknown as string
    const content = removeFrontmatter(raw).trim()
    const meta = parseFilename(filename)
    const inputPath = join(config.directories.input, spec.input, filename)

    entries.push({
      date: meta.date,
      data: createCollectionData(filename, value),
      url: spec.permalink
        ? createCollectionUrl({ page: meta }, spec.permalink, userConfig)
        : `/${spec.input}/${meta.date.getFullYear()}/${meta.slug}`,
      content,
      meta: {
        permalink: spec.permalink,
        collectionName: name,
        collectionSpec: spec,
        raw,
        inputPath
      }
    })
  }
  
  const direction = spec.sortOrder === 'asc' ? 1 : -1
  entries.sort((a, b) => {
    if (spec.sortBy === 'title') {
      return a.data.title.localeCompare(b.data.title) * direction
    }
    return (a.date.getTime() - b.date.getTime()) * direction
  })

  return entries
}
