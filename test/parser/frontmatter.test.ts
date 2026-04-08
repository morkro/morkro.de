import { describe, it } from 'node:test'
import assert from 'node:assert'
import { parseFrontmatter, removeFrontmatter } from '#parser/frontmatter/parser.ts'

const bodyHtml = `<html>
  <body>
    <h1>{{ title }}</h1>
  </body>
</html>`

const testFrontmatter = `---
title: Test
keywords:
  - test
  - test2
permalink: /test
layout: default
pageClass: test
---`

const testFileFull = `${testFrontmatter}

${bodyHtml}
`

const testFileWithout = bodyHtml

const testFileWithBrokenFrontmatter = `-_-
title: Test
keywords:
  - test
  - test2
layout: default
pageClass: test
-

${bodyHtml}
`

const testFileWithCommentedFrontmatter = `---
title: Test
# comment foo
keywords:
  - test
  - test2
---

${bodyHtml}
`

const testQuotedScalars = `---
title: 'Single-quoted title'
subtitle: "Double-quoted: with colon"
---`

const testNestedExternal = `---
external:
 host: SitePoint
 url: https://www.sitepoint.com/article/
layout: post
tags:
 - javascript
 - es6
---`

const testCrlfDelimiters = `---\r
title: CRLF\r
---\r
\r
content`

const testEmptyBlockValue = `---
only_empty:
---
`

const testNoTrailingNewlineInner = '---\ntitle: edge\n---'

type FileMeta = {
	title: string
	keywords: string[]
	permalink: string
	layout: string
	pageClass: string
}

describe('removeFrontmatter', () => {
	it('strips YAML delimiters and leaves body', () => {
		const file = removeFrontmatter(testFileFull)
		assert.strictEqual(file, bodyHtml)
	})

	it('handles CRLF line endings in delimiters', () => {
		const stripped = removeFrontmatter(testCrlfDelimiters)
		assert.ok(stripped.includes('content'))
		assert.ok(!stripped.includes('title: CRLF'))
	})
})

describe('parseFrontmatter', () => {
	it('parses flat keys and list blocks', () => {
		const frontmatter = parseFrontmatter<FileMeta>(testFileFull)
		assert.strictEqual(frontmatter.title, 'Test')
		assert.deepStrictEqual(frontmatter.keywords, ['test', 'test2'])
		assert.strictEqual(frontmatter.permalink, '/test')
		assert.strictEqual(frontmatter.layout, 'default')
		assert.strictEqual(frontmatter.pageClass, 'test')
	})

	it('strips matching single- and double-quoted scalars', () => {
		const p = parseFrontmatter<{ title: string; subtitle: string }>(testQuotedScalars)
		assert.strictEqual(p.title, 'Single-quoted title')
		assert.strictEqual(p.subtitle, 'Double-quoted: with colon')
	})

	it('parses nested mapping (external) and a tag list in one block', () => {
		const p = parseFrontmatter<{
			external: Record<string, string>
			layout: string
			tags: string[]
		}>(testNestedExternal)
		assert.deepStrictEqual(p.external, {
			host: 'SitePoint',
			url: 'https://www.sitepoint.com/article/',
		})
		assert.strictEqual(p.layout, 'post')
		assert.deepStrictEqual(p.tags, ['javascript', 'es6'])
	})

	it('skips # comment lines inside the YAML block', () => {
		const frontmatter = parseFrontmatter<Pick<FileMeta, 'title' | 'keywords'>>(
			testFileWithCommentedFrontmatter
		)
		assert.deepStrictEqual(frontmatter, {
			title: 'Test',
			keywords: ['test', 'test2'],
		})
	})

	it('returns empty object when there are no --- delimiters', () => {
		const frontmatter = parseFrontmatter(testFileWithout)
		assert.deepStrictEqual(frontmatter, {})
	})

	it('returns empty object when opening delimiter is missing', () => {
		const frontmatter = parseFrontmatter<FileMeta>(testFileWithBrokenFrontmatter)
		assert.deepStrictEqual(frontmatter, {})
	})

	it('uses empty string for key with no indented or following value before close', () => {
		const p = parseFrontmatter<{ only_empty: string }>(testEmptyBlockValue)
		assert.strictEqual(p.only_empty, '')
	})

	it('parses when inner block has no trailing newline after last key', () => {
		const p = parseFrontmatter<{ title: string }>(testNoTrailingNewlineInner)
		assert.strictEqual(p.title, 'edge')
	})
})
