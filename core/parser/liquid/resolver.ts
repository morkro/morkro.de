import { dirname, resolve } from 'node:path'
import { cwd } from 'node:process'
import config from '#core/config.core.ts'
import { parseFrontmatter, removeFrontmatter } from '#parser/frontmatter/parser.ts'
import { stripQuotes } from '#parser/utils.ts'
import { loadFile } from '#utils/fs.ts'
import { parseLiquid } from './parser.ts'
import type { Layout, Template } from './types.ts'

function derivePartialFileNames (file: string): string[] {
	const base = stripQuotes(file)
	if (base.endsWith('.liquid') || base.endsWith('.html')) {
		return [base]
	}
	return [`${base}.liquid`, `${base}.html`]
}

export async function layoutResolver (name: string, cache: Map<string, Layout>): Promise<Layout> {
  if (cache.has(name)) return Promise.resolve(cache.get(name) as Layout)

	const fileName = name.endsWith('.liquid') ? name : `${name}.liquid`
	const dir = resolve(cwd(), config.directories.input, config.directories.internal.layouts)
	const source = await loadFile(dir, fileName)
	const frontmatter = parseFrontmatter(source)
	const body = removeFrontmatter(source)
	const path = resolve(dir, fileName)
	const template = parseLiquid(body, path)

	const layout = {
		type: 'Layout',
		template,
		frontmatter,
		meta: { source: path }
	} satisfies Layout

	cache.set(name, layout)
	return layout
}

export async function templateResolver (parentPath: string, file: string): Promise<Template> {
	const globalIncludes = resolve(cwd(), config.directories.input, config.directories.internal.includes)
	const localIncludes = resolve(dirname(parentPath), config.directories.internal.includes)
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
		{ cause: errors[0] },
	)
}
