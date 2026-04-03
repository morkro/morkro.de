/**
 * System configuration
 */

export const DIRECTORIES = {
  SRC: 'src',
  TEMP: '.tmp',
  DEST: '.build',
  PAGES: 'pages',
  INTERNAL: {
    DATA: '_data',
    INCLUDES: 'includes',
    LAYOUTS: '_layouts',
    POSTS: '_posts',
  }
} as const

export const PARSE_EXTENSIONS = ['html', 'txt', 'xml', 'liquid'] as const