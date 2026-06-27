import assert from 'node:assert'
import { describe, it } from 'node:test'
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
		assert.strictEqual(file, `\n\n${bodyHtml}\n`)
	})

	it('handles CRLF line endings in delimiters', () => {
		const stripped = removeFrontmatter(testCrlfDelimiters)
		assert.ok(stripped.includes('content'))
		assert.ok(!stripped.includes('title: CRLF'))
	})

	it('returns input when no frontmatter is present', () => {
		const result = removeFrontmatter('  hello world  ')
		assert.strictEqual(result, '  hello world  ')
	})

	it('only removes the first frontmatter block', () => {
		const input = '---\nfirst: yes\n---\nsome content\n---\nsecond: no\n---'
		const result = removeFrontmatter(input)
		assert.ok(!result.includes('first: yes'))
		assert.ok(result.includes('second: no'))
	})

	it('handles empty frontmatter block', () => {
		const input = '---\n\n---\ncontent here'
		const result = removeFrontmatter(input)
		assert.ok(result.includes('content here'))
	})
})

describe('parseFrontmatter', () => {
	it('parses flat keys and list blocks', () => {
		const frontmatter = parseFrontmatter(testFileFull)
		assert.strictEqual(frontmatter.title, 'Test')
		assert.deepStrictEqual(frontmatter.keywords, ['test', 'test2'])
		assert.strictEqual(frontmatter.permalink, '/test')
		assert.strictEqual(frontmatter.layout, 'default')
		assert.strictEqual(frontmatter.pageClass, 'test')
	})

	it('strips matching single- and double-quoted scalars', () => {
		const p = parseFrontmatter(testQuotedScalars)
		assert.strictEqual(p.title, 'Single-quoted title')
		assert.strictEqual(p.subtitle, 'Double-quoted: with colon')
	})

	it('parses nested mapping (external) and a tag list in one block', () => {
		const p = parseFrontmatter(testNestedExternal)
		assert.deepStrictEqual(p.external, {
			host: 'SitePoint',
			url: 'https://www.sitepoint.com/article/',
		})
		assert.strictEqual(p.layout, 'post')
		assert.deepStrictEqual(p.tags, ['javascript', 'es6'])
	})

	it('skips # comment lines inside the YAML block', () => {
		const frontmatter = parseFrontmatter(
			testFileWithCommentedFrontmatter
		)
		assert.deepStrictEqual(frontmatter, {
			title: 'Test',
			keywords: ['test', 'test2'],
		})
	})

	it('returns empty object when there are no --- delimiters', () => {
		const frontmatter = parseFrontmatter(testFileWithout,)
		assert.deepStrictEqual(frontmatter, {})
	})

	it('returns empty object when opening delimiter is missing', () => {
		const frontmatter = parseFrontmatter(testFileWithBrokenFrontmatter)
		assert.deepStrictEqual(frontmatter, {})
	})

	it('uses empty string for key with no indented or following value before close', () => {
		const p = parseFrontmatter(testEmptyBlockValue)
		assert.strictEqual(p.only_empty, '')
	})

	it('parses when inner block has no trailing newline after last key', () => {
		const p = parseFrontmatter(testNoTrailingNewlineInner)
		assert.strictEqual(p.title, 'edge')
	})

	it('handles empty frontmatter block', () => {
		const p = parseFrontmatter('---\n---')
		assert.deepStrictEqual(p, {})
	})

	it('handles frontmatter with only blank lines', () => {
		const p = parseFrontmatter('---\n\n\n---')
		assert.deepStrictEqual(p, {})
	})

	it('handles frontmatter with only comments', () => {
		const p = parseFrontmatter('---\n# just a comment\n# another\n---')
		assert.deepStrictEqual(p, {})
	})

	it('preserves colons inside values', () => {
		const p = parseFrontmatter('---\nurl: https://example.com:8080/path\n---')
		assert.strictEqual(p.url, 'https://example.com:8080/path')
	})

	it('preserves colons inside quoted values', () => {
		const p = parseFrontmatter('---\ntime: "12:30:00"\n---')
		assert.strictEqual(p.time, '12:30:00')
	})

	it('handles multiple list blocks', () => {
		const input = `---
tags:
  - javascript
  - typescript
categories:
  - web
  - frontend
---`
		const p = parseFrontmatter(input)
		assert.deepStrictEqual(p.tags, ['javascript', 'typescript'])
		assert.deepStrictEqual(p.categories, ['web', 'frontend'])
	})

	it('handles multiple nested map blocks', () => {
		const input = `---
author:
  name: Alice
  email: alice@example.com
social:
  twitter: alice
  github: alice123
---`
		const p = parseFrontmatter(input)
		assert.deepStrictEqual(p.author, { name: 'Alice', email: 'alice@example.com' })
		assert.deepStrictEqual(p.social, { twitter: 'alice', github: 'alice123' })
	})

	it('handles mixed flat values, lists, and maps in one block', () => {
		const input = `---
title: My Post
layout: default
tags:
  - blog
  - tech
author:
  name: Bob
draft: false
---`
		const p = parseFrontmatter(input)
		assert.strictEqual(p.title, 'My Post')
		assert.strictEqual(p.layout, 'default')
		assert.deepStrictEqual(p.tags, ['blog', 'tech'])
		assert.deepStrictEqual(p.author, { name: 'Bob' })
		assert.strictEqual(p.draft, false)
	})

	it('coerces numeric values to numbers', () => {
		const p = parseFrontmatter('---\nport: 8080\n---')
		assert.strictEqual(p.port, 8080)
	})

	it('coerces boolean-like values to booleans', () => {
		const p = parseFrontmatter('---\npublished: true\n---')
		assert.strictEqual(p.published, true)
	})

	it('skips lines without a colon', () => {
		const p = parseFrontmatter('---\nno colon here\ntitle: valid\n---')
		assert.strictEqual(p.title, 'valid')
		assert.ok(!('no colon here' in (p as Record<string, unknown>)))
	})

	it('handles values with leading whitespace after colon', () => {
		const p = parseFrontmatter('---\ntitle:   spaced   \n---')
		assert.strictEqual(p.title, 'spaced')
	})

	it('handles list items with quoted values', () => {
		const input = `---
items:
  - 'quoted item'
  - "double quoted"
  - unquoted
---`
		const p = parseFrontmatter(input)
		assert.deepStrictEqual(p.items, ['quoted item', 'double quoted', 'unquoted'])
	})

	it('handles key followed by indented block then another key', () => {
		const input = `---
nested:
  inner: value
after: next
---`
		const p = parseFrontmatter(input)
		assert.deepStrictEqual(p.nested, { inner: 'value' })
		assert.strictEqual(p.after, 'next')
	})
})
