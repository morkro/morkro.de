import assert from 'node:assert'
import { describe, it } from 'node:test'
import { parseMarkdown } from '#parser/markdown/parser.ts'
import { renderMarkdown } from '#parser/markdown/renderer.ts'
import type { TokenHtmlBlock } from '#parser/markdown/types.ts'

const render = (input: string) =>
	renderMarkdown(parseMarkdown(input, 'test.md').body)

describe('parseMarkdown: HTML blocks', () => {
	it('includes the opening tag line in HtmlBlock raw', () => {
		const input = `<div class="note--snippet">
	<p>hello</p>
</div>`

		const tokens = parseMarkdown(input, 'test.md').body
		assert.strictEqual(tokens.length, 1)
		assert.strictEqual(tokens[0].type, 'HtmlBlock')

		const block = tokens[0] as TokenHtmlBlock
		assert.match(block.raw, /^<div class="note--snippet">/)
		assert.match(block.raw, /<\/div>$/)
	})

	it('renders a complete div block with opening and closing tags', () => {
		const input = `<div class="note--snippet">
	<p>Take a look at the rest of my <code>.eslintrc</code> configuration <a href="https://example.com" target="_blank" rel="noopener">here</a>.</p>
</div>

Let's be honest`

		const html = render(input)
		assert.match(html, /^<div class="note--snippet">/)
		assert.match(html, /<\/div><p>Let's be honest<\/p>$/)
	})

	it('renders multiple consecutive HTML blocks without dropping opening tags', () => {
		const input = `<div class="note--snippet">
	<p>first</p>
</div>

<p>between</p>

<div class="note--snippet">
	<p>second</p>
</div>`

		const html = render(input)
		const openingTags = html.match(/<div class="note--snippet">/g)
		const closingTags = html.match(/<\/div>/g)

		assert.strictEqual(openingTags?.length, 2)
		assert.strictEqual(closingTags?.length, 2)
		assert.match(html, /<div class="note--snippet">\s*<p>first<\/p>\s*<\/div>/)
		assert.match(html, /<div class="note--snippet">\s*<p>second<\/p>\s*<\/div>/)
	})
})
