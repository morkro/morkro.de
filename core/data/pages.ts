import type { UserConfig } from '#config.user'
import type { BuildItem } from '#emitter/traverse.ts'
import { toUrl } from '#utils/url.ts'

export type PageEntry = {
	url: string
	lastModified: Date
}

export function buildPagesData(
	files: BuildItem[],
	userConfig: UserConfig,
	outputRoot: string,
): PageEntry[] {
	const baseUrl = userConfig.baseUrl ?? ''

	return files
		.filter((file) => file.outputPath.endsWith('/index.html'))
		.map((file) => ({
			url: toUrl(baseUrl, outputRoot, file.outputPath),
			lastModified: file.lastModified ?? new Date(),
		}))
		.sort((a, b) => a.url.localeCompare(b.url))
}