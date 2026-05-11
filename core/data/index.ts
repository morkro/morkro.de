import type { UserConfig } from '#config.user'
import { loadCollection } from './collections.ts'
import { loadFromDir, loadFromFile } from './loader.ts'

export type DataFileMap = Map<string, unknown>

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
	const data = new Map(await loadFromDir('data'))

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
			data.set(key, pickValues(raw as Record<string, unknown>, getByKey.get(key)))
		}
	}

	const collections: Record<string, unknown> = {}
	for (const [name, spec] of userConfig?.collections ?? new Map([])) {
		const collection = await loadCollection(name, spec, userConfig)
		if (collection) {
			collections[name] = collection
		}
	}

	if (Object.keys(collections).length > 0) {
		data.set('collections', collections)
	}
	
	return data
}