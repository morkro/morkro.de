import { basename, dirname, join, relative } from 'node:path'
import { type PassthroughRoot, resolvePassthrough } from '#emitter/passthrough.ts'
import type { CollectionMatch } from '#emitter/traverse.ts'
import { defaultEngines, resolveEngine } from '#engines/registry.ts'
import { extractFrontmatter } from '#parser/frontmatter/index.ts'
import { loadFile } from '#utils/fs.ts'
import { resolveOutput } from '#utils/path.ts'

export async function resolveBuildItemOutputPath(
	inputPath: string,
	inputDir: string,
	outputRoot: string,
	collection: CollectionMatch | undefined,
	passthrough: PassthroughRoot[],
): Promise<string> {
	if (collection) {
		return join(outputRoot, collection.entry.url ?? '', 'index.html')
	}

	const passthroughPath = resolvePassthrough(inputPath, passthrough)
	if (passthroughPath) {
		return passthroughPath
	}

	const engine = resolveEngine(defaultEngines, inputPath)
	if (!engine) {
		return join(outputRoot, relative(inputDir, inputPath))
	}

	if (engine.id === 'css') {
		return join(outputRoot, relative(inputDir, inputPath))
	}

	const raw = await loadFile<string>(dirname(inputPath), basename(inputPath))
	const { frontmatter } = extractFrontmatter(raw)
  
	return resolveOutput(inputPath, outputRoot, frontmatter.permalink as string | undefined)
}