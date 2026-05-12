import { readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import config from '#config'
import type { InternalDirectory } from '#config'
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

export async function safeRename(from: string, to: string) {
	try {
		await rename(from, to)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return
    }
		throw new Error(`Failed to rename "${from}" -> "${to}"`, { cause: error })
	}
}

export async function swapDirectories(from: string, to: string) {
  const oldOutput = `${to}.old`
  await safeRename(to, oldOutput)
  await safeRename(from, to)
  await rm(oldOutput, { recursive: true })
}

export async function walkFiles (
  input :string,
  options: { skip: Set<InternalDirectory> },
  onFile: (inputPath: string) => Promise<void>
) {
  for (const file of await readdir(input)) {
    if (options.skip.has(file as InternalDirectory)) {
      continue
    }

    const inputPath = join(input, file)
    const stats = await stat(inputPath)

    if (stats.isSymbolicLink()) {
      continue
    }

    if (stats.isDirectory()) {
      await walkFiles(inputPath, options, onFile)
      continue
    }
    
    if (stats.isFile()) {
      await onFile(inputPath)
    }
  }
}