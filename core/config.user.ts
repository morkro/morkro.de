import type { ShortCodeFn, FilterFn } from '#config'
import type { EmitProfile } from '#emitter/output.ts'
import { minifyHtml } from '#transforms/minify-html.ts'
import { escapeXML } from '#utils/html.ts'

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

function currentYear () {
  return new Date().getFullYear().toString()
}

const config: UserConfig = {
  debugMode: process.env.DEBUG === 'true',
  devMode: process.env.NODE_ENV === 'development',
  prodMode: process.env.NODE_ENV === 'production',
  baseUrl: 'https://morkro.de',
  passThroughCopy: [
    { from: 'src/assets', to: 'assets', },
    { from: 'src/scripts', to: 'assets/scripts', },
  ],
  artifactTransforms: new Map([
    ['.html', {
      prod: [(body, outputPath, ctx) => minifyHtml(body)],
    }]
  ]),
  shortCodes: {
    currentYear,
  },
  filters: {
    encodeXML: escapeXML,
  },
  collections: new Map([
    ['posts', {
      input: 'posts',
      sortBy: 'date',
      sortOrder: 'desc',
      permalink: `/writes/{{ page.date | date: 'year' }}/{{ page.slug }}/`
    }]
  ])
}

export default config