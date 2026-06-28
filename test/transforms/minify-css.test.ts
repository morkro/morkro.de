import { describe, it } from 'node:test'
import assert from 'node:assert'
import { minifyCss } from '#transforms/minify-css.ts'

describe('minifyCss', () => {
	it('collapses whitespace in a simple rule', () => {
		assert.strictEqual(
			minifyCss('.foo { color: red; }'),
			'.foo{color:red;}',
		)
	})

	it('strips block comments', () => {
		assert.strictEqual(
			minifyCss('/* comment */ .bar { color: blue; }'),
			' .bar{color:blue;}',
		)
	})

	it('preserves spaces inside quoted strings', () => {
		assert.strictEqual(
			minifyCss('content: "hello world";'),
			'content:"hello world";',
		)
	})

	it('preserves data URLs in quoted strings', () => {
		const input = 'url("data:image/svg+xml,%3Csvg%3E")'
		assert.strictEqual(minifyCss(input), input)
	})

	it('minifies @layer blocks', () => {
		assert.strictEqual(
			minifyCss('@layer reset { .a { margin: 0; } }'),
			'@layer reset{.a{margin:0;}}',
		)
	})

	it('minifies @media range queries', () => {
		assert.strictEqual(
			minifyCss('@media (width <= 768px) { .x { color: red; } }'),
			'@media (width <= 768px){.x{color:red;}}',
		)
	})

	it('keeps calc spacing after var()', () => {
		assert.strictEqual(
			minifyCss('--line-height-base: calc(var(--font-size-base) * 1.78);'),
			'--line-height-base:calc(var(--font-size-base) * 1.78);',
		)
	})

	it('keeps space between var() and following values in shorthands', () => {
		assert.strictEqual(
			minifyCss('padding: var(--gap-large) 0 0;'),
			'padding:var(--gap-large) 0 0;',
		)
		assert.strictEqual(
			minifyCss('border: var(--border-width-base) solid var(--white);'),
			'border:var(--border-width-base) solid var(--white);',
		)
	})

	it('preserves font src url and format strings', () => {
		assert.strictEqual(
			minifyCss('src: url("../assets/fonts/Roboto-Regular.ttf") format("truetype");'),
			'src:url("../assets/fonts/Roboto-Regular.ttf") format("truetype");',
		)
	})
})
