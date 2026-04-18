/**
 * System configuration
 */
export type ParseExtension = 'html' | 'txt' | 'xml' | 'liquid' | 'md'

export interface CoreConfig {
  directories: {
    src: string
    temp: string
    dest: string
    pages: string
    posts: string
    internal: {
      data: string
      includes: string
      layouts: string
      posts: string
    }
  }
  parser: {
    parseExtensions: ParseExtension[]
    parseLiquidExtensions: ParseExtension[]
    concurrency: number
  }
  reservedKeys: Set<string>
}

const config: CoreConfig = {
  directories: {
    src: 'src',
    temp: '.tmp',
    dest: '.build',
    pages: 'pages',
    posts: 'posts',
    internal: {
      data: '_data',
      includes: 'includes',
      layouts: '_layouts',
      posts: '_posts',
    }
  },
  parser: {
    parseExtensions: ['html', 'txt', 'xml', 'liquid', 'md'],
    parseLiquidExtensions: ['html', 'liquid'],
    concurrency: 8,
  },
  reservedKeys: new Set([
    'page',
    'content',
    'collections',
    '__shortCodes__',
    '__counters__',
  ]),
}

export default config