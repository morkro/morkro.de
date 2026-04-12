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
  baseUrl?: string 
  customDataMapping?: {
    [key: string]: string | CustomDataFields
  }
  passThroughCopy?: PassThroughCopy[]
  shortCodes?: {
    [key: string]: () => unknown
  }
  collections?: {
    posts?: {
      sortBy: 'date' | 'title'
      sortOrder: 'asc' | 'desc'
      layout: string
      permalink: string
    }
  }
}

const config: UserConfig = {
  baseUrl: 'https://morkro.de',
  customDataMapping: {
    'pkg': {
      path: './package.json',
      includeFields: ['version', 'author'],
    },
  },
  passThroughCopy: [
    { from: 'src/assets', to: 'assets', },
    { from: 'src/scripts', to: 'assets/scripts', },
  ],
  shortCodes: {
    'currentYear': () => new Date().getFullYear(),
  },
  collections: {
    posts: {
      sortBy: 'date',
      sortOrder: 'desc',
      layout: 'post',
      permalink: `/writes/{{ page.date | date: '%Y/' }}/{{ page.fileSlug }}/`
    }
  }
}

export default config