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
  parseExtensions: ParseExtension[]
  parseLiquidExtensions: ParseExtension[]
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
  parseExtensions: ['html', 'txt', 'xml', 'liquid', 'md'],
  parseLiquidExtensions: ['html', 'liquid'],
  reservedKeys: new Set([
    'page',
    'shortCodes',
    'eleventy',
    'content',
    'collections',
  ]),
}

export default config