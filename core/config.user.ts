import type { EmitProfile } from "#emitter/output.ts"
import { minifyHtml } from "#transforms/minify-html.ts"
import { escapeXML } from "#utils/html.ts"
import type { ShortCodeFn, FilterFn } from "#core/config.core.ts"

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
  collections?: {
    posts?: {
      sortBy: 'date' | 'title'
      sortOrder: 'asc' | 'desc'
      layout?: string
      permalink: string
    }
  }
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
  collections: {
    posts: {
      sortBy: 'date',
      sortOrder: 'desc',
      permalink: `/writes/{{ page.date | date: 'year' }}/{{ page.slug }}/`
    }
  }
}

export default config