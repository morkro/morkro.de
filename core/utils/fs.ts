import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type { FullPage } from '#parser/liquid/types.ts'
import { resolveWithin } from './path-resolve.ts'
import config from '#config'

export async function loadFile(path: string, fileName: string): Promise<string> {
  const fullPath = resolveWithin(path, fileName)
  try {
    return await readFile(fullPath, 'utf-8')
  } catch (error) {
    throw new Error(`Failed to load file at ${fullPath}`, { cause: error })
  }
}

export async function writeTempAst(
  ast: FullPage,
  frontmatter: Record<string, unknown>,
  fileName: string
) {
  const slug = typeof frontmatter.title === 'string' && frontmatter.title.trim() !== ''
    ? String(frontmatter.title).toLowerCase().replace(/\s+/g, '-')
  : basename(fileName, extname(fileName))
  await writeFile(
    join(config.directories.temp, `${slug}.ast.json`),
    JSON.stringify(ast, null, 2),
    'utf-8')
}