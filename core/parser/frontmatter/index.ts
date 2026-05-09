import { parseFrontmatter, removeFrontmatter } from './parser.ts'

export function extractFrontmatter (source: string) {
  const frontmatter = parseFrontmatter(source)
  const body = removeFrontmatter(source)
  return { frontmatter, body }
}