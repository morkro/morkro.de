import { dirname, resolve } from 'node:path'
import { cwd } from 'node:process'
import { DIRECTORIES } from '#core/config.core.ts'
import { loadFile } from '#utils/fs.ts'
import { parseLiquid } from './parser.ts'
import type { Template } from './types'

function stripQuotes (file: string): string {
	return file.replace(/^['"]|['"]$/g, '')
}

function derivePartialFileNames (file: string): string[] {
	const base = stripQuotes(file)
	if (base.endsWith('.liquid') || base.endsWith('.html')) {
		return [base]
	}
	return [`${base}.liquid`, `${base}.html`]
}

export async function templateResolver (parentPath: string, file: string): Promise<Template> {
	const globalIncludes = resolve(cwd(), DIRECTORIES.SRC, '_includes')
	const localIncludes = resolve(dirname(parentPath), DIRECTORIES.INTERNAL.INCLUDES)
	const searchRoots = [globalIncludes, localIncludes]
	const errors: unknown[] = []

	for (const root of searchRoots) {
		for (const fileName of derivePartialFileNames(file)) {
			try {
				const content = await loadFile(root, fileName)
				const fullPath = resolve(root, fileName)
				return parseLiquid(content, fullPath)
			} catch (error) {
				errors.push(error)
			}
		}
	}

	throw new Error(
		`Could not resolve partial ${file} (from ${parentPath}). Tried roots: ${searchRoots.join(', ')}`,
		{ cause: errors.at(-1) },
	)
}
