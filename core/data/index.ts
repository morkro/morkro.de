import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import config from '#config'
import type { UserConfig } from '#config.user'
import { logger } from '#utils/log.ts'
import { isRecord } from '#utils/object.ts'
import { loadCollection } from './collections.ts'
import { loadFromDir, loadFromFile } from './loader.ts'

export type DataFileMap = Map<string, unknown>

const log = logger('Data')

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

	if (userConfig?.baseUrl) {
		const site = data.get('site')
		if (isRecord(site)) {
			data.set('site', { ...site, url: userConfig.baseUrl })
		}
	}

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
			if (isRecord(raw)) {
				data.set(key, pickValues(raw, getByKey.get(key)))
				continue
			}
			if (Array.isArray(raw)) {
				if (getByKey.get(key)?.length) {
					log.warn('"customData.includeFields" is ignored for arrays', { key })
				}
				data.set(key, raw)
			}
		}
	}

	const collections: Record<string, unknown> = {}
	for (const [name, spec] of userConfig?.collections ?? new Map([])) {
		const collection = await loadCollection(name, spec, userConfig)
		if (collection.length > 0) {
			collections[name] = collection
		}
	}

	if (Object.keys(collections).length > 0) {
		data.set('collections', collections)
	}
	
	return data
}
	
export async function writeDataFilesDump (dataFiles: DataFileMap, fileName: string) {
	await mkdir(resolve(config.directories.temp), { recursive: true })
	await writeFile(
		join(resolve(config.directories.temp), fileName),
		JSON.stringify(Object.fromEntries(dataFiles.entries()), null, 2),
		'utf-8'
	)
}