/**
 * User configuration
 */
export interface CustomDataFields {
  path: string
  values: string[]
}

interface UserConfig {
  baseUrl?: string 
  customDataMapping?: {
    [key: string]: string | CustomDataFields
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
      values: ['version', 'author'],
    },
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