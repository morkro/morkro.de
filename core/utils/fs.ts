import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join, resolve, sep } from 'node:path'
import config from '#config'
import type { FullPage } from '#parser/liquid/types.ts'

export async function loadFile(path: string, fileName: string): Promise<string> {
  const resolvedBase = resolve(path)
  const normalisedBase = resolvedBase + sep
  const resolvedPath = resolve(resolvedBase, fileName)

  if (resolvedPath !== resolvedBase && !resolvedPath.startsWith(normalisedBase)) {
    throw new Error(`Requested file (${resolvedPath}) is not within ${path}/ directory`)
  }

  try {
    return readFile(resolvedPath, 'utf-8')
  } catch (error) {
    throw new Error(`Failed to load file at ${resolvedPath}`, { cause: error })
  }
}

export function ensureExtension(fileName: string, extension: string): string {
  if (!fileName.endsWith(extension)) {
    return fileName + extension
  }
  return fileName
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