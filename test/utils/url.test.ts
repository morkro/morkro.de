import { describe, it } from 'node:test'
import assert from 'node:assert'
import { toUrl } from '#utils/url.ts'

describe('toUrl function', () => {
	it('strips .build prefix and returns path relative to base', () => {
		assert.strictEqual(
			toUrl('https://moritz.berlin', '.build/about/index.html'),
			'https://moritz.berlin/about/'
		)
	})

	it('strips trailing index.html from the URL', () => {
		assert.strictEqual(
			toUrl('https://moritz.berlin', '.build/index.html'),
			'https://moritz.berlin/'
		)
	})

	it('keeps non-index filenames intact', () => {
		assert.strictEqual(
			toUrl('https://moritz.berlin', '.build/feed.xml'),
			'https://moritz.berlin/feed.xml'
		)
	})

	it('removes trailing slash from base before joining', () => {
		assert.strictEqual(
			toUrl('https://moritz.berlin/', '.build/about/index.html'),
			'https://moritz.berlin/about/'
		)
	})

	it('handles deeply nested output paths', () => {
		assert.strictEqual(
			toUrl('https://moritz.berlin', '.build/blog/2024/post/index.html'),
			'https://moritz.berlin/blog/2024/post/'
		)
	})

	it('handles output that is just .build with no subpath', () => {
		assert.strictEqual(
			toUrl('https://moritz.berlin', '.build/'),
			'https://moritz.berlin/'
		)
	})
})
