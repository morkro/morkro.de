import type { UserConfig } from "#config.user"
import { minifyCss } from "#core/transforms/minify-css.ts"
import { minifyHtml } from "#core/transforms/minify-html.ts"
import { escapeXML } from "#core/utils/html.ts"

function currentYear () {
  return new Date().getFullYear().toString()
}

const config: UserConfig = {
  debugMode: process.env.DEBUG === 'true',
  devMode: process.env.NODE_ENV === 'development',
  prodMode: process.env.NODE_ENV === 'production',
  baseUrl: 'https://moritz.berlin',
  passThroughCopy: [
    { from: 'src/assets', to: 'assets', },
    { from: 'src/scripts', to: 'assets/scripts', },
  ],
  artifactTransforms: new Map([
    ['.html', {
      prod: [(body) => minifyHtml(body)],
    }],
    ['.css', {
      prod: [(body) => minifyCss(body)],
    }]
  ]),
  shortCodes: {
    currentYear,
  },
  filters: {
    encodeXML: escapeXML,
  },
  collections: new Map([
    ['posts', {
      input: 'posts',
      sortBy: 'date',
      sortOrder: 'desc',
      permalink: `/writes/{{ page.date | date: 'year' }}/{{ page.slug }}/`
    }]
  ])
}

export default config