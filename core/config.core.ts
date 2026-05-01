/**
 * System configuration
 */
export type ParseExtension = 'html' | 'txt' | 'xml' | 'liquid' | 'md'

export interface CoreConfig {
  livereload: {
    // This is the GUID for the WebSocket protocol based on the RFC 6455 specification
    // https://datatracker.ietf.org/doc/html/rfc6455#section-4.1
    wsGuid: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
  }
  directories: {
    src: string
    temp: string
    dest: string
    pages: string
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
  livereload: {
    wsGuid: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
  },
  directories: {
    src: 'src',
    temp: '.tmp',
    dest: '.build',
    pages: 'pages',
    internal: {
      data: '_data',
      includes: '_includes',
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
    '__cycles__',
    '__filters__',
  ]),
}

export default config