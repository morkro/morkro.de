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

type ShortCodeFn = () => unknown
export type FilterFn = (input: unknown, ...args: unknown[]) => unknown

export type UserConfig = {
  debugMode?: boolean
  baseUrl?: string 
  customDataMapping?: {
    [key: string]: string | CustomDataFields
  }
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
  return new Date().getFullYear()
}

function encodeXML (input) {
  return (input as string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const config: UserConfig = {
  debugMode: process.env.DEBUG === 'true',
  baseUrl: 'https://morkro.de',
  passThroughCopy: [
    { from: 'src/assets', to: 'assets', },
    { from: 'src/scripts', to: 'assets/scripts', },
  ],
  shortCodes: {
    currentYear,
  },
  filters: {
    encodeXML,
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