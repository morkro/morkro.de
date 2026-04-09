/**
 * User configuration
 */
interface UserConfig {
  baseUrl?: string 
  customDataMapping?: {
    [key: string]: string
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
    'pkg': './package.json',
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