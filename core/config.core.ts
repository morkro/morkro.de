/**
 * System configuration
 */
export type ParseExtension = '.html' | '.txt' | '.xml' | '.liquid' | '.md'

export type ShortCodeFn = () => string
export type FilterFn = (input: string, ...args: string[]) => string
export type RenderServices = {
  page: Record<string, unknown>
  content: Record<string, unknown>
  collections: Record<string, unknown>
  __shortCodes__: Record<string, ShortCodeFn>
  __filters__: Record<string, FilterFn>
  __counters__: Map<string, number>
  __cycles__: Map<string, number>
}

export type InternalDirectory =
  | 'data' 
  | 'includes' 
  | 'layouts' 
  | 'posts' 
  | 'drafts'

export interface CoreConfig {
  livereload: {
    // This is the GUID for the WebSocket protocol based on the RFC 6455 specification
    // https://datatracker.ietf.org/doc/html/rfc6455#section-4.1
    wsGuid: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
  }
  directories: {
    input: string
    output: string
    temp: string
    pages: string
    internal: Set<InternalDirectory>
  }
  parser: {
    parseExtensions: ParseExtension[]
    concurrency: number
  }
  reservedKeys: Set<keyof RenderServices>
}

const config: CoreConfig = {
  livereload: {
    wsGuid: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
  },
  directories: {
    input: 'src',
    output: '.build',
    temp: '.tmp',
    pages: 'pages',
    internal: new Set([
      'data',
      'includes',
      'layouts',
      'posts',
      'drafts',
    ])
  },
  parser: {
    parseExtensions: ['.html', '.txt', '.xml', '.liquid', '.md'],
    concurrency: 8,
  },
  reservedKeys: new Set([
    'page',
    'content',
    'collections',
    '__shortCodes__',
    '__counters__',
    '__cycles__',
    '__filters__',
  ]),
}

export default config