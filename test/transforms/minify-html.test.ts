import { describe, it } from 'node:test'
import assert from 'node:assert'
import { minifyHtml } from '#transforms/minify-html.ts'

describe('minifyHtml', () => {
	it('collapses whitespace between tags', () => {
		assert.strictEqual(
			minifyHtml('<div>\n  <p>hello</p>\n</div>'),
			'<div><p>hello</p></div>',
		)
	})

	it('strips HTML comments outside protected blocks', () => {
		assert.strictEqual(
			minifyHtml('<div><!-- note --><p>hello</p></div>'),
			'<div><p>hello</p></div>',
		)
	})

	it('preserves whitespace inside script blocks', () => {
		const script = `<script>
  const page = { url: 'https://moritz.berlin/is/' }
</script>`
		const input = `<div>  </div>\n${script}`

		assert.strictEqual(minifyHtml(input), `<div></div>${script}`)
	})

	it('preserves whitespace inside style blocks', () => {
		const style = `<style>
  .foo {
    color: red;
  }
</style>`
		const input = `<main>\n  ${style}\n</main>`

		assert.strictEqual(minifyHtml(input), `<main>${style}</main>`)
	})
})
