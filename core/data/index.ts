import config from '#core/config.core.ts'
import type { UserConfig } from '#core/config.user.ts'
import { loadFromDir, loadFromFile } from './loader.ts'
import { loadPosts } from './posts.ts'
import type { DataFileMap } from './types.ts'

function pickValues(
  source: Record<string, unknown>,
  values: string[] | undefined
): Record<string, unknown> {
	if (!values || values.length === 0) {
		return source
	}
	
  const result: Record<string, unknown> = {}
	for (const value of values) {
		if (Object.prototype.hasOwnProperty.call(source, value)) {
			result[value] = source[value]
		}
	}
	
  return result
}

export async function loadDataFiles(userConfig?: UserConfig): Promise<DataFileMap> {
	const data = new Map([
		...(await loadFromDir(config.directories.internal.data)),
	])

	if (userConfig?.customDataMapping) {
		const paths: Record<string, string> = {}
		const getByKey = new Map<string, string[] | undefined>()

		for (const [key, spec] of Object.entries(userConfig.customDataMapping)) {
			if (typeof spec === 'string') {
				paths[key] = spec
				getByKey.set(key, undefined)
			} else {
				paths[key] = spec.path
				getByKey.set(key, spec.includeFields)
			}
		}

		const file = await loadFromFile(paths)
		for (const [key, raw] of file) {
			data.set(key, pickValues(raw, getByKey.get(key)))
		}
	}

	const posts = await loadPosts(userConfig)
	if (posts?.length > 0) {
		data.set('collections', { posts })
	}

	return data
}