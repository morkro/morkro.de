import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import config from '#config'
import type { FullPage } from '#parser/liquid/types.ts'
import { resolveWithin } from './path-resolve.ts'

export async function loadFile<T extends string | Buffer>(path: string, fileName: string, encoding?: BufferEncoding | null): Promise<T> {
  const fullPath = resolveWithin(path, fileName)
  try {
    if (encoding === null) {
      return await readFile(fullPath) as T
    }
    return await readFile(fullPath, { encoding: encoding ?? 'utf-8' }) as T
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