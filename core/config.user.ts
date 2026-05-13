import type { FilterFn, ShortCodeFn } from '#config'
import type { EmitProfile } from '#emitter/output.ts'
import { logger } from '#utils/log.ts'
import { resolveWithin } from '#utils/path-resolve.ts'

const log = logger('UserConfig')

/**
 * User configuration
 */
export type CustomDataFields = {
  path: string
  includeFields: string[]
}

export type PassThroughCopy = {
  from: string
  to: string
}

export type CollectionSource = {
  input: string
  permalink: string
  sortBy: 'date' | 'title'
  sortOrder: 'asc' | 'desc'
}

export type UserConfig = {
  debugMode?: boolean
  devMode?: boolean
  prodMode?: boolean
  baseUrl?: string 
  customDataMapping?: {
    [key: string]: string | CustomDataFields
  }
  artifactTransforms?: Map<string, EmitProfile>
  passThroughCopy?: PassThroughCopy[]
  shortCodes?: Record<string, ShortCodeFn>
  filters?: Record<string, FilterFn>
  collections?: Map<string, CollectionSource>
}

export async function getUserConfig (): Promise<UserConfig> {
  try {
    return await import(
      resolveWithin(process.cwd(), './site.config.ts')
    ).then(module => module.default)
  } catch (error) {
    log.error('Failed to import user config', { error })
    throw error
  }
}